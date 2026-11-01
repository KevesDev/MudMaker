#include "mudmaker/control/session.h"
#include <google/protobuf/util/json_util.h>
#include <algorithm>
#include <fstream>
#include <limits>
#include <thread>
#ifndef MUDMAKER_ENGINE_VERSION
#error Engine build version is required
#endif
namespace mudmaker::control {
namespace {
namespace pb=wire::pb;
struct Failure { pb::ErrorCode code; std::string native,reason; std::optional<ecs::SchemaError> schema; };
[[noreturn]] void reject(std::string code,std::string reason,pb::ErrorCode category=pb::INVALID_REQUEST){throw Failure{category,std::move(code),std::move(reason),{}};}
template<typename T>T wire_value(wire::Result<T> result){if(auto e=std::get_if<wire::Error>(&result))reject("control.conversion","Control value representation is invalid.");return std::move(std::get<T>(result));}
template<typename T>T native(ecs::WorldResult<T> result){
 if(auto e=std::get_if<ecs::WorldError>(&result)){
  auto code=e->code==ecs::WorldErrorCode::WrongWriter?pb::INTERNAL_FAILURE:e->code==ecs::WorldErrorCode::Unavailable?pb::NOT_READY:pb::WORLD_FAILURE;
  throw Failure{code,native_code(*e),std::string(e->schema?e->schema->reason:e->reason),e->schema};
 }return std::move(std::get<T>(result));
}
std::string clipped(std::string_view text,std::size_t maximum){auto n=std::min(text.size(),maximum);while(n&&n<text.size()&&(static_cast<unsigned char>(text[n])&0xc0)==0x80)--n;return std::string(text.substr(0,n));}
void erase(PairingToken& token)noexcept{volatile std::uint8_t* bytes=token.data();for(std::size_t i=0;i<token.size();++i)bytes[i]=0;}
std::string read_config(const std::string& path){std::ifstream file(path,std::ios::binary);if(!file)reject("control.configuration","Configuration file could not be opened.");std::string out;char c;while(out.size()<=kConfigurationInputBytes&&file.get(c))out.push_back(c);if(out.size()>kConfigurationInputBytes||file.bad())reject("control.configuration","Configuration input exceeds its bound or cannot be read.");return out;}
pb::Envelope response_base(const pb::Envelope& request){pb::Envelope out;out.mutable_protocol()->set_major(1);out.mutable_protocol()->set_minor(0);out.set_connection_id(request.connection_id());out.set_request_id(request.request_id());return out;}
void validate_config(const Configuration& c){
 if(std::holds_alternative<wire::Error>(wire::validate_policy(c.wire)))reject("control.configuration","Wire policy is invalid.");const auto&r=c.runtime;
 if(!r.schema_nodes()||!r.schema_name_bytes()||!r.chunk_target_bytes()||r.chunk_target_bytes()>static_cast<std::uint64_t>(std::numeric_limits<std::ptrdiff_t>::max())||!r.page_limit()||r.page_limit()>c.wire.value_nodes||!r.minimum_control_frame_bytes()||r.minimum_control_frame_bytes()>c.wire.frame_bytes||!r.error_text_bytes()||!r.error_path_bytes()||r.error_text_bytes()>c.wire.text_bytes||r.error_path_bytes()>c.wire.text_bytes||static_cast<std::uint64_t>(r.error_text_bytes())+r.error_path_bytes()>r.minimum_control_frame_bytes())reject("control.configuration","Runtime controls are missing or incompatible with wire bounds.");
 pb::Envelope worst;worst.mutable_protocol()->set_major(1);worst.set_request_id(std::numeric_limits<std::uint64_t>::max());worst.set_connection_id(std::string(kNamedId));auto*e=worst.mutable_error();e->set_code(pb::WORLD_FAILURE);e->set_native_code("world.identity/identity.namespace_retry_exhausted");e->set_message(std::string(r.error_text_bytes(),'x'));e->set_world_id(std::string(kNamedId));e->mutable_entity()->set_world_id(std::string(kNamedId));e->mutable_entity()->set_entity_id(ecs::kInvalidEntityIndex-1u);e->mutable_entity()->set_generation(std::numeric_limits<std::uint32_t>::max());e->set_component_type_id(std::string(kNamedId));e->set_schema_revision(std::numeric_limits<std::uint32_t>::max());e->add_field_path(std::string(kNameFieldId));e->add_field_path(std::string(r.error_path_bytes(),'x'));
 if(worst.ByteSizeLong()>r.minimum_control_frame_bytes()||std::holds_alternative<wire::Error>(wire::encode(worst,c.wire)))reject("control.configuration","Runtime controls cannot guarantee a bounded correlated error.");
}
struct Target{std::optional<ecs::EntityId>entity;std::optional<ecs::ComponentTypeId>component;std::uint32_t revision=0;std::optional<ecs::FieldId>field;};
}
Result<Configuration> load_configuration(const std::string& wire_path,const std::string& runtime_path){try{auto parsed=wire::parse_policy(read_config(wire_path));if(auto e=std::get_if<wire::Error>(&parsed))return StartupError{"control.configuration","Wire configuration is invalid."};Configuration c{std::get<wire::Policy>(parsed),{}};const auto json=read_config(runtime_path);if(!google::protobuf::util::JsonStringToMessage(json,&c.runtime).ok())return StartupError{"control.configuration","Runtime configuration JSON is invalid."};validate_config(c);return c;}catch(const Failure&e){return StartupError{e.native,e.reason};}catch(const std::exception&){return StartupError{"control.configuration","Configuration allocation failed."};}}
struct ControlSession::State{
 ecs::IdentityDomain domain;std::shared_ptr<const ecs::ComponentRegistry>registry;std::unique_ptr<ecs::World>world;ecs::WorldId id;std::vector<ecs::ComponentBinding>bindings;
 const Configuration config;PairingToken token;const std::thread::id writer=std::this_thread::get_id();enum class Phase{AwaitHello,Ready,Closing};Phase phase=Phase::AwaitHello;std::uint64_t last=0;std::string connection;
 State(Configuration c,PairingToken t):config(std::move(c)),token(t){}~State(){erase(token);}
 Reply error(const pb::Envelope& request,const Failure& f,const Target& target={},bool closing=false){
  auto out=response_base(request);auto*e=out.mutable_error();e->set_code(f.code);e->set_native_code(f.native);e->set_message(clipped(f.reason,config.runtime.error_text_bytes()));
  if(target.entity){*e->mutable_entity()=wire::wire_entity(*target.entity);e->set_world_id(wire::guid(target.entity->world.bytes()));}
  if(target.component){e->set_component_type_id(wire::guid(target.component->bytes()));if(target.revision)e->set_schema_revision(target.revision);}
  if(f.schema){if(f.schema->component!=ecs::ComponentTypeId{})e->set_component_type_id(wire::guid(f.schema->component.bytes()));if(f.schema->field)e->add_field_path(wire::guid(f.schema->field->bytes()));if(!f.schema->path.empty())e->add_field_path(clipped(f.schema->path,config.runtime.error_path_bytes()));}
  else if(target.field)e->add_field_path(wire::guid(target.field->bytes()));
  auto encoded=wire::encode(out,config.wire);if(auto bytes=std::get_if<std::vector<std::uint8_t>>(&encoded))return {std::move(*bytes),closing,MutationOutcome::None,{}};
  if(writer==std::this_thread::get_id())phase=Phase::Closing;
  return {{},true,MutationOutcome::None,clipped("Control error response could not be encoded.",config.runtime.error_text_bytes())};
 }
 ecs::ComponentTypeId component_id(const std::string& text,std::uint32_t revision,Target& target){target.component=ecs::ComponentTypeId(wire_value(wire::parse_guid(text)));target.revision=revision;return *target.component;}
 wire::NativeComponent component(const pb::ComponentValue& value,wire::ConversionContext& context,Target& target){
  auto type=component_id(value.component_type_id(),value.schema_revision(),target);auto found=registry->lookup(type,value.schema_revision());
  if(auto e=std::get_if<ecs::SchemaError>(&found))throw Failure{pb::WORLD_FAILURE,"world.schema/"+native_code(*e),std::string(e->reason),*e};
  return wire_value(context.native_component(value,*registry));
 }
 pb::Envelope dispatch(const pb::Envelope& request,Target& target,bool& committed){
  auto out=response_base(request);auto context=wire_value(wire::ConversionContext::create(config.wire));
  const auto ref=[&](const auto&r){target.entity=wire_value(wire::native_entity(r.entity()));return *target.entity;};
  const auto offset=[](std::uint64_t n){if(n>std::numeric_limits<std::size_t>::max())reject("control.offset","Page offset is not representable.");return static_cast<std::size_t>(n);};
  const auto page_limit=[&](std::uint32_t n){if(!n||n>config.runtime.page_limit())reject("control.page_limit","Requested page limit is invalid.");};
  const auto ack=[&](ecs::EntityId entity){committed=true;*out.mutable_mutation_ack()->mutable_entity()=wire::wire_entity(entity);};
  switch(request.body_case()){
   case pb::Envelope::kCatalogRequest:{auto&r=request.catalog_request();page_limit(r.limit());auto page=registry->catalog_page(offset(r.offset()),r.limit());if(auto e=std::get_if<ecs::SchemaError>(&page))throw Failure{pb::WORLD_FAILURE,native_code(*e),std::string(e->reason),*e};auto metadata=schema_metadata(std::get<ecs::ComponentCatalogPage>(page),bindings,config.wire);if(std::holds_alternative<wire::Error>(metadata))reject("control.response_too_large","Catalog exceeds response bounds.");*out.mutable_catalog_result()=std::move(std::get<pb::CatalogResult>(metadata));break;}
   case pb::Envelope::kListEntitiesRequest:{auto&r=request.list_entities_request();page_limit(r.limit());auto page=native(world->inspect_live_page(offset(r.offset()),r.limit()));auto*p=out.mutable_list_entities_result();p->set_total(page.total);if(page.next_offset)p->set_next_offset(*page.next_offset);for(auto entity:page.entities)*p->add_entities()=wire::wire_entity(entity);break;}
   case pb::Envelope::kInspectEntity:{auto entity=ref(request.inspect_entity());auto snapshot=native(world->inspect(entity));wire::NativeInspection value{snapshot.id,{}};for(auto&c:snapshot.components)value.components.push_back({std::move(c.schema),std::move(c.value)});auto converted=wire::wire_inspection(value,config.wire);if(std::holds_alternative<wire::Error>(converted))reject("control.response_too_large","Inspection exceeds response bounds.");*out.mutable_entity_inspection()=std::move(std::get<pb::EntityInspection>(converted));break;}
   case pb::Envelope::kCreateEntityRequest:{std::vector<ecs::ComponentValue> values;for(auto&v:request.create_entity_request().components()){auto c=component(v,*context,target);values.push_back({c.schema->id,c.schema->revision,std::move(c.value)});}const auto entity=native(world->create_entity(values));committed=true;target.entity=entity;*out.mutable_create_entity_result()->mutable_entity()=wire::wire_entity(entity);break;}
   case pb::Envelope::kDestroyEntityRequest:{auto entity=ref(request.destroy_entity_request());native(world->destroy_entity(entity));ack(entity);break;}
   case pb::Envelope::kAddComponentRequest:{auto&r=request.add_component_request();auto entity=ref(r);auto c=component(r.component(),*context,target);native(world->add_component(entity,{c.schema->id,c.schema->revision,std::move(c.value)}));ack(entity);break;}
   case pb::Envelope::kRemoveComponentRequest:{auto&r=request.remove_component_request();auto entity=ref(r);auto type=component_id(r.component_type_id(),r.schema_revision(),target);native(world->remove_component(entity,type,r.schema_revision()));ack(entity);break;}
   case pb::Envelope::kReplaceComponentRequest:{auto&r=request.replace_component_request();auto entity=ref(r);auto c=component(r.component(),*context,target);native(world->replace_component(entity,{c.schema->id,c.schema->revision,std::move(c.value)}));ack(entity);break;}
   case pb::Envelope::kReplaceFieldRequest:{auto&r=request.replace_field_request();auto entity=ref(r);auto type=component_id(r.component_type_id(),r.schema_revision(),target);target.field=ecs::FieldId(wire_value(wire::parse_guid(r.field_id())));auto descriptor=native(world->field_type(type,r.schema_revision(),*target.field));auto value=wire_value(context->native_value(r.value(),*descriptor));native(world->replace_field(entity,type,r.schema_revision(),*target.field,value));ack(entity);break;}
   case pb::Envelope::kShutdownRequest:out.mutable_shutdown_ack();phase=Phase::Closing;break;
   default:reject("control.client_body","Body is not a client request.");
  }return out;
 }
};
ControlSession::ControlSession(std::unique_ptr<State> state)noexcept:state_(std::move(state)){}ControlSession::~ControlSession()=default;
ecs::WorldId ControlSession::world_id()const noexcept{return state_->id;}
Result<std::unique_ptr<ControlSession>> ControlSession::create(Configuration configuration,PairingToken token){
 try{validate_config(configuration);auto state=std::make_unique<State>(std::move(configuration),token);erase(token);auto made=ecs::ComponentRegistry::create({state->config.runtime.schema_nodes(),state->config.wire.value_nodes,state->config.wire.value_depth,state->config.wire.text_bytes,state->config.runtime.schema_name_bytes()});
  if(auto e=std::get_if<ecs::SchemaError>(&made))return StartupError{native_code(*e),std::string(e->reason)};
  std::shared_ptr<ecs::ComponentRegistry> registry(std::move(std::get<std::unique_ptr<ecs::ComponentRegistry>>(made)));
  ecs::ComponentDefinition named{ecs::ComponentTypeId(wire_value(wire::parse_guid(kNamedId))),"mudmaker.core.named",1,ecs::PersistenceMode::Persistent,"Name",{}, {}};
  auto text=std::make_shared<ecs::ValueDefinition>();text->kind=ecs::FieldKind::Text;
  auto nullable=std::make_shared<ecs::ValueDefinition>();nullable->kind=ecs::FieldKind::Text;nullable->nullable=true;
  named.fields={{ecs::FieldId(wire_value(wire::parse_guid(kNameFieldId))),"name",true,ecs::SchemaValue{std::string{}},text,"Name",{}},{ecs::FieldId(wire_value(wire::parse_guid(kDescriptionFieldId))),"description",false,{},nullable,"Description",{}}};
  auto registered=registry->register_builtin(named);if(auto e=std::get_if<ecs::SchemaError>(&registered))return StartupError{native_code(*e),std::string(e->reason)};registry->freeze();state->registry=registry;state->bindings={{named.id,1,ecs::StoragePlacement::Archetype}};
  auto allocated=state->domain.create_world();if(auto e=std::get_if<ecs::IdentityError>(&allocated))return StartupError{native_code(*e),std::string(e->message)};auto&allocator=std::get<ecs::WorldAllocator>(allocated);state->id=allocator.world_id();auto world=ecs::World::create(std::move(allocator),state->registry,state->bindings,{static_cast<std::size_t>(state->config.runtime.chunk_target_bytes())});if(auto e=std::get_if<ecs::WorldError>(&world))return StartupError{native_code(*e),std::string(e->reason)};state->world=std::move(std::get<std::unique_ptr<ecs::World>>(world));return std::unique_ptr<ControlSession>(new ControlSession(std::move(state)));
 }catch(const Failure&e){erase(token);return StartupError{e.native,e.reason};}catch(const std::exception&){erase(token);return StartupError{"control.bootstrap","Native bootstrap allocation failed."};}
}
Reply ControlSession::receive(std::span<const std::uint8_t> frame){
 auto&state=*state_;bool committed=false;Target target;
 try{auto decoded=wire::decode_frame(frame,state.config.wire);if(std::holds_alternative<wire::Error>(decoded)){if(state.writer==std::this_thread::get_id())state.phase=State::Phase::Closing;return {{},true,MutationOutcome::None,"Control frame could not be decoded."};}const auto&request=std::get<pb::Envelope>(decoded);
  if(!request.request_id()||std::holds_alternative<wire::Error>(wire::parse_guid(request.connection_id()))){if(state.writer==std::this_thread::get_id())state.phase=State::Phase::Closing;return {{},true,MutationOutcome::None,"Control correlation is invalid."};}
  if(state.writer!=std::this_thread::get_id())return state.error(request,{pb::INTERNAL_FAILURE,"world.wrong_writer","Control dispatch requires its creating writer.",{}},{},true);
  if(state.phase==State::Phase::Closing)return state.error(request,{pb::SHUTTING_DOWN,"control.closing","Control session is closing.",{}},{},true);
  if(state.phase==State::Phase::Ready){if(request.connection_id()!=state.connection)return state.error(request,{pb::UNAUTHORIZED,"control.connection","Connection does not match the paired session.",{}});if(request.request_id()<=state.last)return state.error(request,{pb::INVALID_REQUEST,"control.request_id","Request IDs must increase.",{}});state.last=request.request_id();}
  if(!request.has_protocol()||request.protocol().major()!=1||request.protocol().minor()!=0||(request.has_hello()&&(request.hello().min_minor()!=0||request.hello().max_minor()<request.hello().min_minor())))return state.error(request,{pb::UNSUPPORTED_PROTOCOL,"control.version","Unsupported control protocol.",{}});
  if(std::holds_alternative<wire::Error>(wire::validate_envelope(request,state.config.wire)))return state.error(request,{pb::MALFORMED_MESSAGE,"control.representation","Malformed control request.",{}});
  if(state.phase==State::Phase::AwaitHello){if(!request.has_hello())return state.error(request,{pb::INVALID_REQUEST,"control.await_hello","Hello is required before operations.",{}});unsigned difference=0;for(std::size_t i=0;i<state.token.size();++i)difference|=state.token[i]^static_cast<std::uint8_t>(request.hello().pairing_token()[i]);if(difference)return state.error(request,{pb::UNAUTHORIZED,"control.pairing","Pairing token is incorrect.",{}});state.connection=request.connection_id();state.last=request.request_id();state.phase=State::Phase::Ready;erase(state.token);auto out=response_base(request);auto*ack=out.mutable_hello_ack();ack->set_selected_minor(0);ack->set_engine_version(MUDMAKER_ENGINE_VERSION);ack->set_world_id(wire::guid(state.id.bytes()));auto encoded=wire::encode(out,state.config.wire);if(auto bytes=std::get_if<std::vector<std::uint8_t>>(&encoded))return {std::move(*bytes),false,MutationOutcome::None,{}};state.phase=State::Phase::Closing;return {{},true,MutationOutcome::None,"Hello response could not be encoded."};}
  try{auto out=state.dispatch(request,target,committed);auto encoded=wire::encode(out,state.config.wire);if(auto bytes=std::get_if<std::vector<std::uint8_t>>(&encoded))return {std::move(*bytes),state.phase==State::Phase::Closing,committed?MutationOutcome::Committed:MutationOutcome::None,{}};if(committed){state.phase=State::Phase::Closing;return {{},true,MutationOutcome::Unknown,"Committed response could not be encoded."};}return state.error(request,{pb::INVALID_REQUEST,"control.response_too_large","Response exceeds configured bounds.",{}},target);}catch(const Failure&e){return state.error(request,e,target);}
 }catch(const std::exception&){if(state.writer==std::this_thread::get_id())state.phase=State::Phase::Closing;return {{},true,committed?MutationOutcome::Unknown:MutationOutcome::None,"Control dispatch could not complete."};}
}
}  // namespace mudmaker::control
