#include "mudmaker/control/session.h"
#include <cstdio>
#include <filesystem>
#include <fstream>
#include <limits>
#include <stdexcept>
#include <thread>
#include <fcntl.h>
#include <io.h>
using namespace mudmaker;
namespace epb=wire::pb;
namespace shared=::mudmaker::scripting::v1;
#define CHECK(x) do{if(!(x))throw std::runtime_error(std::string(__FILE__)+":"+std::to_string(__LINE__)+" " #x);}while(false)
namespace {
// Deliberately public non-secret fixture, confined to this test executable and Rust test.
constexpr std::uint8_t kFixtureTokenByte=0x5a;
constexpr std::string_view kFixtureConnection="00112233-4455-6677-8899-aabbccddeeff";
control::PairingToken token(){control::PairingToken t{};t.fill(kFixtureTokenByte);return t;}
template<typename T>T take(wire::Result<T> r){if(auto e=std::get_if<wire::Error>(&r))throw std::runtime_error(e->path+": "+e->reason);return std::move(std::get<T>(r));}
template<typename T>T schema(ecs::SchemaResult<T> r){if(auto e=std::get_if<ecs::SchemaError>(&r))throw std::runtime_error(std::string(e->reason));return std::move(std::get<T>(r));}
template<typename T>T startup(control::Result<T> r){if(auto e=std::get_if<control::StartupError>(&r))throw std::runtime_error(e->code+": "+e->reason);return std::move(std::get<T>(r));}
control::Configuration config(){return startup(control::load_configuration(WIRE_POLICY_FILE,RUNTIME_POLICY_FILE));}
epb::EngineValue text(std::string value){epb::EngineValue out;out.mutable_primitive()->set_text_value(std::move(value));return out;}
epb::EngineValue integer(std::int64_t value){epb::EngineValue out;out.mutable_primitive()->set_integer_value(value);return out;}
epb::ComponentValue named(){epb::ComponentValue out;out.set_component_type_id(std::string(control::kNamedId));out.set_schema_revision(1);out.mutable_value()->mutable_record();return out;}
void add_field(epb::ComponentValue& c,std::string_view id,epb::EngineValue value){auto*f=c.mutable_value()->mutable_record()->add_fields();f->set_field_id(std::string(id));*f->mutable_value()=std::move(value);}
const epb::EngineValue& field(const epb::ComponentValue& c,std::string_view id){for(const auto&f:c.value().record().fields())if(f.field_id()==id)return f.value();throw std::runtime_error("Missing field");}
std::vector<std::uint8_t> malformed_frame(const epb::Envelope& value){const auto s=value.SerializeAsString();CHECK(s.size()<=std::numeric_limits<std::uint32_t>::max());auto n=static_cast<std::uint32_t>(s.size());std::vector<std::uint8_t> out{static_cast<std::uint8_t>(n>>24),static_cast<std::uint8_t>(n>>16),static_cast<std::uint8_t>(n>>8),static_cast<std::uint8_t>(n)};out.insert(out.end(),s.begin(),s.end());return out;}
struct Harness{
 control::Configuration settings;std::unique_ptr<control::ControlSession> session;std::uint64_t sequence=0;
 explicit Harness(control::Configuration c=config()):settings(std::move(c)),session(startup(control::ControlSession::create(settings,token()))){}
 epb::Envelope request(){epb::Envelope r;r.mutable_protocol()->set_major(1);r.set_connection_id(std::string(kFixtureConnection));r.set_request_id(++sequence);return r;}
 epb::Envelope send(const epb::Envelope&r,bool raw=false){auto reply=session->receive(raw?malformed_frame(r):take(wire::encode(r,settings.wire)));CHECK(!reply.frame.empty());auto out=take(wire::decode(reply.frame,settings.wire));CHECK(out.request_id()==r.request_id()&&out.connection_id()==r.connection_id());return out;}
 epb::Envelope hello(){auto r=request();auto t=token();r.mutable_hello()->set_pairing_token(t.data(),t.size());auto out=send(r);CHECK(out.has_hello_ack()&&out.hello_ack().world_id()==wire::guid(session->world_id().bytes()));return out;}
 shared::EntityRef create(bool with_named=false){auto r=request();r.mutable_create_entity_request();if(with_named)*r.mutable_create_entity_request()->add_components()=named();auto out=send(r);CHECK(out.has_create_entity_result());return out.create_entity_result().entity();}
 epb::Envelope inspect(const shared::EntityRef&e){auto r=request();*r.mutable_inspect_entity()->mutable_entity()=e;return send(r);}
 std::uint64_t count(){auto r=request();r.mutable_list_entities_request()->set_limit(1);auto out=send(r);CHECK(out.has_list_entities_result());return out.list_entities_result().total();}
 epb::Envelope replace(const shared::EntityRef&e,std::string_view id,epb::EngineValue value,std::uint32_t rev=1){auto r=request();auto*f=r.mutable_replace_field_request();*f->mutable_entity()=e;f->set_component_type_id(std::string(control::kNamedId));f->set_schema_revision(rev);f->set_field_id(std::string(id));*f->mutable_value()=std::move(value);return send(r);}
};
void error(const epb::Envelope& e,epb::ErrorCode category,std::string_view native){CHECK(e.has_error());CHECK(e.error().code()==category&&e.error().native_code()==native);CHECK(!e.error().message().empty());}
void configuration_and_actual_bootstrap(){
 auto missing=control::load_configuration("missing-control-fixture",RUNTIME_POLICY_FILE);CHECK(std::holds_alternative<control::StartupError>(missing));
 std::filesystem::create_directories(CONTROL_TEST_DIRECTORY);auto path=std::filesystem::path(CONTROL_TEST_DIRECTORY)/"invalid-runtime.json";
 {std::ofstream out(path,std::ios::binary);out<<"{\"unknown\":1}";}CHECK(std::holds_alternative<control::StartupError>(control::load_configuration(WIRE_POLICY_FILE,path.string())));
 {std::ofstream out(path,std::ios::binary);out<<std::string(control::kConfigurationInputBytes+1,' ');}CHECK(std::holds_alternative<control::StartupError>(control::load_configuration(WIRE_POLICY_FILE,path.string())));
 auto c=config();c.runtime.set_page_limit(0);CHECK(std::holds_alternative<control::StartupError>(control::ControlSession::create(c,token())));
 c=config();c.runtime.set_schema_nodes(1);CHECK(std::holds_alternative<control::StartupError>(control::ControlSession::create(c,token())));
 c=config();c.runtime.set_chunk_target_bytes(0);CHECK(std::holds_alternative<control::StartupError>(control::ControlSession::create(c,token())));
 Harness h;h.hello();CHECK(h.count()==0);auto r=h.request();r.mutable_catalog_request()->set_limit(1);auto out=h.send(r);CHECK(out.has_catalog_result());const auto&cat=out.catalog_result();CHECK(cat.total()==1&&cat.schemas_size()==1&&!cat.has_next_offset());const auto&s=cat.schemas(0);
 CHECK(s.component_type_id()==control::kNamedId&&s.name()=="mudmaker.core.named"&&s.schema_revision()==1&&s.persistence()==epb::PERSISTENCE_PERSISTENT&&s.placement()==epb::PLACEMENT_ARCHETYPE);
 CHECK(s.fields_size()==2&&s.fields(0).field_id()==control::kNameFieldId&&s.fields(0).required()&&s.fields(0).has_default_value());CHECK(s.fields(0).default_value().primitive().has_text_value()&&s.fields(0).default_value().primitive().text_value().empty());CHECK(s.fields(1).field_id()==control::kDescriptionFieldId&&!s.fields(1).required()&&!s.fields(1).has_default_value());
 for(const auto&t:s.types()){CHECK(t.kind()==epb::VALUE_KIND_TEXT);CHECK(t.nullable()==(t.type_id()==s.fields(1).type_id()));}
 r=h.request();r.mutable_catalog_request()->set_offset(1);r.mutable_catalog_request()->set_limit(1);out=h.send(r);CHECK(out.catalog_result().schemas_size()==0&&out.catalog_result().total()==1);
 r=h.request();r.mutable_list_entities_request()->set_limit(h.settings.runtime.page_limit()+1);error(h.send(r),epb::INVALID_REQUEST,"control.page_limit");CHECK(h.count()==0);
}
void pairing_correlation_and_writer(){
 Harness h;auto r=h.request();r.mutable_create_entity_request();error(h.send(r),epb::INVALID_REQUEST,"control.await_hello");r=h.request();r.mutable_hello()->set_pairing_token(std::string(control::kPairingTokenBytes,'Q'));auto denied=h.send(r);error(denied,epb::UNAUTHORIZED,"control.pairing");CHECK(denied.SerializeAsString().find(std::string(control::kPairingTokenBytes,'Q'))==std::string::npos);
 h.hello();CHECK(h.count()==0);r=h.request();r.mutable_create_entity_request();r.set_connection_id("ffeeddcc-bbaa-9988-7766-554433221100");error(h.send(r),epb::UNAUTHORIZED,"control.connection");CHECK(h.count()==0);
 r=h.request();r.mutable_list_entities_request()->set_limit(1);CHECK(h.send(r).has_list_entities_result());error(h.send(r),epb::INVALID_REQUEST,"control.request_id");r.set_request_id(r.request_id()-1);error(h.send(r),epb::INVALID_REQUEST,"control.request_id");
 r=h.request();r.mutable_shutdown_ack();error(h.send(r),epb::INVALID_REQUEST,"control.client_body");CHECK(h.count()==0);
 r=h.request();r.mutable_protocol()->set_major(2);r.mutable_create_entity_request();error(h.send(r,true),epb::UNSUPPORTED_PROTOCOL,"control.version");CHECK(h.count()==0);
 r=h.request();r.mutable_list_entities_request()->set_limit(1);auto frame=take(wire::encode(r,h.settings.wire));control::Reply reply;std::thread other([&]{reply=h.session->receive(frame);});other.join();CHECK(reply.closing);error(take(wire::decode(reply.frame,h.settings.wire)),epb::INTERNAL_FAILURE,"world.wrong_writer");CHECK(h.send(r).has_list_entities_result());
 r=h.request();r.mutable_shutdown_request();auto out=h.send(r);CHECK(out.has_shutdown_ack());r=h.request();r.mutable_create_entity_request();error(h.send(r),epb::SHUTTING_DOWN,"control.closing");
 Harness invalid;r=invalid.request();r.set_request_id(0);r.mutable_create_entity_request();reply=invalid.session->receive(malformed_frame(r));CHECK(reply.closing&&reply.frame.empty());
 Harness invalid_guid;r=invalid_guid.request();r.set_connection_id("invalid");r.mutable_create_entity_request();reply=invalid_guid.session->receive(malformed_frame(r));CHECK(reply.closing&&reply.frame.empty());
}
void real_mutations_and_atomic_native_errors(){
 Harness h;h.hello();auto e=h.create();CHECK(e.world_id()==wire::guid(h.session->world_id().bytes()));CHECK(h.inspect(e).entity_inspection().components_size()==0);
 auto r=h.request();*r.mutable_add_component_request()->mutable_entity()=e;*r.mutable_add_component_request()->mutable_component()=named();CHECK(h.send(r).has_mutation_ack());auto inspected=h.inspect(e);CHECK(field(inspected.entity_inspection().components(0),control::kNameFieldId).primitive().text_value().empty());CHECK(inspected.entity_inspection().components(0).value().record().fields_size()==1);
 r=h.request();*r.mutable_add_component_request()->mutable_entity()=e;*r.mutable_add_component_request()->mutable_component()=named();error(h.send(r),epb::WORLD_FAILURE,"world.duplicate_component");
 CHECK(h.replace(e,control::kNameFieldId,text("Ada")).has_mutation_ack());epb::EngineValue null;null.mutable_primitive()->set_explicit_null(true);CHECK(h.replace(e,control::kDescriptionFieldId,null).has_mutation_ack());inspected=h.inspect(e);CHECK(field(inspected.entity_inspection().components(0),control::kDescriptionFieldId).primitive().explicit_null());
 auto bad=h.replace(e,control::kNameFieldId,integer(7));error(bad,epb::WORLD_FAILURE,"world.schema/schema.wrong_type");CHECK(bad.error().entity().SerializeAsString()==e.SerializeAsString()&&bad.error().component_type_id()==control::kNamedId&&bad.error().schema_revision()==1);CHECK(bad.error().field_path_size()>=1&&bad.error().field_path(0)==control::kNameFieldId);CHECK(field(h.inspect(e).entity_inspection().components(0),control::kNameFieldId).primitive().text_value()=="Ada");
 error(h.replace(e,control::kNamedId,text("bad")),epb::WORLD_FAILURE,"world.unknown_field");error(h.replace(e,control::kNameFieldId,text("bad"),2),epb::WORLD_FAILURE,"world.revision_mismatch");CHECK(field(h.inspect(e).entity_inspection().components(0),control::kNameFieldId).primitive().text_value()=="Ada");
 r=h.request();auto*replace=r.mutable_replace_component_request();*replace->mutable_entity()=e;auto value=named();add_field(value,control::kNameFieldId,text("Grace"));add_field(value,control::kDescriptionFieldId,text("description"));*replace->mutable_component()=value;CHECK(h.send(r).has_mutation_ack());inspected=h.inspect(e);CHECK(field(inspected.entity_inspection().components(0),control::kNameFieldId).primitive().text_value()=="Grace"&&field(inspected.entity_inspection().components(0),control::kDescriptionFieldId).primitive().text_value()=="description");
 r=h.request();auto*remove=r.mutable_remove_component_request();*remove->mutable_entity()=e;remove->set_component_type_id(std::string(control::kNamedId));remove->set_schema_revision(1);CHECK(h.send(r).has_mutation_ack());CHECK(h.inspect(e).entity_inspection().components_size()==0);r.set_request_id(++h.sequence);error(h.send(r),epb::WORLD_FAILURE,"world.missing_component");
 r=h.request();*r.mutable_replace_component_request()->mutable_entity()=e;*r.mutable_replace_component_request()->mutable_component()=named();error(h.send(r),epb::WORLD_FAILURE,"world.missing_component");
 auto second=h.create(true);CHECK(h.count()==2);r=h.request();*r.mutable_create_entity_request()->add_components()=named();*r.mutable_create_entity_request()->add_components()=named();error(h.send(r),epb::WORLD_FAILURE,"world.duplicate_component");CHECK(h.count()==2);
 r=h.request();r.mutable_list_entities_request()->set_limit(1);auto page=h.send(r);CHECK(page.list_entities_result().entities_size()==1&&page.list_entities_result().has_next_offset());auto first=page.list_entities_result().entities(0);r=h.request();r.mutable_list_entities_request()->set_limit(1);r.mutable_list_entities_request()->set_offset(page.list_entities_result().next_offset());page=h.send(r);CHECK(page.list_entities_result().entities_size()==1&&!page.list_entities_result().has_next_offset()&&first.SerializeAsString()!=page.list_entities_result().entities(0).SerializeAsString());
 r=h.request();*r.mutable_destroy_entity_request()->mutable_entity()=e;CHECK(h.send(r).has_mutation_ack());CHECK(h.count()==1);auto reused=h.create();CHECK(reused.entity_id()==e.entity_id()&&reused.generation()==e.generation()+1);error(h.inspect(e),epb::WORLD_FAILURE,"world.identity/identity.stale_generation");CHECK(h.inspect(reused).has_entity_inspection());
 Harness foreign;auto foreign_ref=second;foreign_ref.set_world_id(wire::guid(foreign.session->world_id().bytes()));error(h.inspect(foreign_ref),epb::WORLD_FAILURE,"world.identity/identity.foreign_world");CHECK(h.count()==2);
}
void oversized_read_preserves_separately_updated_state(){auto c=config();c.wire.frame_bytes=c.runtime.minimum_control_frame_bytes();Harness h(c);h.hello();auto e=h.create(true);constexpr std::size_t kLargeFieldBytes=1200;CHECK(h.replace(e,control::kNameFieldId,text(std::string(kLargeFieldBytes,'N'))).has_mutation_ack());CHECK(h.replace(e,control::kDescriptionFieldId,text(std::string(kLargeFieldBytes,'D'))).has_mutation_ack());error(h.inspect(e),epb::INVALID_REQUEST,"control.response_too_large");CHECK(h.replace(e,control::kNameFieldId,text("kept")).has_mutation_ack());auto out=h.inspect(e);CHECK(out.has_entity_inspection());CHECK(field(out.entity_inspection().components(0),control::kNameFieldId).primitive().text_value()=="kept");CHECK(field(out.entity_inspection().components(0),control::kDescriptionFieldId).primitive().text_value()==std::string(kLargeFieldBytes,'D'));}
template<typename Id>Id fixture_id(std::uint8_t value){std::array<std::uint8_t,16> b{};b.back()=value;return Id(b);}
std::shared_ptr<ecs::ValueDefinition> type(ecs::FieldKind kind){auto t=std::make_shared<ecs::ValueDefinition>();t->kind=kind;return t;}
ecs::FieldDefinition definition(std::uint8_t id,std::string name,ecs::FieldKind kind){return {fixture_id<ecs::FieldId>(id),std::move(name),false,{},type(kind),"Display","Description"};}
epb::Envelope metadata_fixture(){
 auto c=config();auto registry=schema(ecs::ComponentRegistry::create({c.runtime.schema_nodes(),c.wire.value_nodes,c.wire.value_depth,c.wire.text_bytes,c.runtime.schema_name_bytes()}));
 ecs::ComponentDefinition d{fixture_id<ecs::ComponentTypeId>(101),"creator.metadata",7,ecs::PersistenceMode::Persistent,"Metadata","Lossless metadata fixture",{}};
 auto b=definition(1,"boolean",ecs::FieldKind::Boolean);b.default_value=ecs::SchemaValue{true};b.type->constraints.enum_values={{true},{false}};
 auto n=definition(2,"integer",ecs::FieldKind::Integer);n.default_value=ecs::SchemaValue{std::numeric_limits<std::int64_t>::min()};n.type->constraints.integer_min=std::numeric_limits<std::int64_t>::min();n.type->constraints.integer_max=std::numeric_limits<std::int64_t>::max();n.type->constraints.enum_values={{std::numeric_limits<std::int64_t>::min()},{std::numeric_limits<std::int64_t>::max()}};
 auto f=definition(3,"floating",ecs::FieldKind::Floating);f.default_value=ecs::SchemaValue{1.25};f.type->constraints.floating_min=-2.0;f.type->constraints.floating_max=2.0;
 auto t=definition(4,"text",ecs::FieldKind::Text);t.type->nullable=true;t.default_value=ecs::SchemaValue{};t.type->constraints.text_min_bytes=0;t.type->constraints.text_max_bytes=16;
 auto e=definition(5,"entity",ecs::FieldKind::Entity);e.type->nullable=true;e.default_value=ecs::SchemaValue{};
 auto a=definition(6,"asset",ecs::FieldKind::Asset);a.default_value=ecs::SchemaValue{ecs::AssetReference{fixture_id<ecs::AssetId>(111),3}};
 auto r=definition(7,"record",ecs::FieldKind::Record);auto child=definition(9,"child",ecs::FieldKind::Text);child.required=true;r.type->fields={child};r.default_value=ecs::SchemaValue{ecs::SchemaValue::Record{{"child",{std::string("nested")}}}};
 auto l=definition(8,"list",ecs::FieldKind::List);l.type->element=type(ecs::FieldKind::Record);auto item=definition(10,"number",ecs::FieldKind::Integer);item.required=true;l.type->element->fields={item};l.type->constraints.list_min_items=0;l.type->constraints.list_max_items=4;l.default_value=ecs::SchemaValue{ecs::SchemaValue::List{{ecs::SchemaValue::Record{{"number",{std::int64_t{42}}}}}}};
 d.fields={b,n,f,t,e,a,r,l,definition(11,"absent",ecs::FieldKind::Text)};schema(registry->register_creator(d));registry->freeze();auto page=schema(registry->catalog_page(0,1));const ecs::ComponentBinding bindings[]={{d.id,d.revision,ecs::StoragePlacement::Sparse}};
 epb::Envelope out;out.mutable_protocol()->set_major(1);out.set_connection_id(std::string(kFixtureConnection));out.set_request_id(1);*out.mutable_catalog_result()=take(control::schema_metadata(page,bindings,c.wire));return out;
}
void flat_metadata_is_lossless_and_bounded(){
 const auto c=config();auto message=metadata_fixture();auto decoded=take(wire::decode(take(wire::encode(message,c.wire)),c.wire));CHECK(decoded.SerializeAsString()==message.SerializeAsString());const auto&s=decoded.catalog_result().schemas(0);CHECK(s.placement()==epb::PLACEMENT_SPARSE&&s.persistence()==epb::PERSISTENCE_PERSISTENT&&s.fields_size()==9);
 const epb::ValueKind expected[]={epb::VALUE_KIND_BOOLEAN,epb::VALUE_KIND_INTEGER,epb::VALUE_KIND_FLOATING,epb::VALUE_KIND_TEXT,epb::VALUE_KIND_ENTITY,epb::VALUE_KIND_ASSET,epb::VALUE_KIND_RECORD,epb::VALUE_KIND_LIST};
 for(std::size_t index=0;index<std::size(expected);++index){const auto id=s.fields(static_cast<int>(index)).type_id();bool found=false;for(const auto&t:s.types())if(t.type_id()==id){CHECK(t.kind()==expected[index]);found=true;}CHECK(found);}
 CHECK(!s.fields(8).has_default_value()&&s.fields(3).default_value().primitive().explicit_null());for(const auto&t:s.types()){if(t.kind()==epb::VALUE_KIND_INTEGER&&t.constraints().has_integer_min())CHECK(t.constraints().integer_min()==std::numeric_limits<std::int64_t>::min()&&t.constraints().integer_max()==std::numeric_limits<std::int64_t>::max());if(t.kind()==epb::VALUE_KIND_LIST)CHECK(t.element_type_id()!=0&&t.constraints().has_list_min_items()&&t.constraints().list_min_items()==0&&t.constraints().list_max_items()==4);}
 const auto rejected=[&](epb::Envelope value,wire::ErrorCode code){auto result=wire::encode(value,c.wire);CHECK(std::holds_alternative<wire::Error>(result)&&std::get<wire::Error>(result).code==code);};
 auto bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_fields(0)->set_type_id(999);rejected(bad,wire::ErrorCode::Value);
 bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_fields(0)->set_field_id("");rejected(bad,wire::ErrorCode::Identity);
 bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_types(0)->set_kind(epb::VALUE_KIND_UNSPECIFIED);rejected(bad,wire::ErrorCode::Value);
 bad=message;auto*cycle=bad.mutable_catalog_result()->mutable_schemas(0)->mutable_types(0);cycle->set_kind(epb::VALUE_KIND_LIST);cycle->set_element_type_id(cycle->type_id());rejected(bad,wire::ErrorCode::Value);
 bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_types(0)->mutable_constraints()->set_floating_min(std::numeric_limits<double>::quiet_NaN());rejected(bad,wire::ErrorCode::Value);
 bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_fields(0)->mutable_default_value()->clear_value();rejected(bad,wire::ErrorCode::Value);
 bad=message;auto*unreachable=bad.mutable_catalog_result()->mutable_schemas(0)->add_types();unreachable->set_type_id(999);unreachable->set_kind(epb::VALUE_KIND_TEXT);rejected(bad,wire::ErrorCode::Value);
 bad=message;bad.mutable_catalog_result()->mutable_schemas(0)->mutable_types(1)->set_type_id(1);rejected(bad,wire::ErrorCode::Value);
 auto policy=c.wire;policy.value_nodes=1;auto bounded=wire::encode(message,policy);CHECK(std::get<wire::Error>(bounded).code==wire::ErrorCode::Limit);
}
int binary_session(){
 CHECK(_setmode(_fileno(stdin),_O_BINARY)!=-1);CHECK(_setmode(_fileno(stdout),_O_BINARY)!=-1);auto c=config();auto session=startup(control::ControlSession::create(c,token()));
 for(;;){std::array<std::uint8_t,4> prefix{};auto n=std::fread(prefix.data(),1,prefix.size(),stdin);if(n==0&&std::feof(stdin))return 0;CHECK(n==prefix.size());std::uint32_t length=0;for(auto b:prefix)length=(length<<8)|b;CHECK(length>0&&length<=c.wire.frame_bytes);std::vector<std::uint8_t> frame(prefix.begin(),prefix.end());frame.resize(prefix.size()+length);CHECK(std::fread(frame.data()+prefix.size(),1,length,stdin)==length);auto reply=session->receive(frame);if(!reply.frame.empty()){CHECK(std::fwrite(reply.frame.data(),1,reply.frame.size(),stdout)==reply.frame.size());CHECK(std::fflush(stdout)==0);}if(reply.closing)return 0;}
}
} // namespace
int main(int argc,char**argv){try{if(argc==2&&std::string_view(argv[1])=="--session")return binary_session();if(argc==3&&std::string_view(argv[1])=="--write-metadata"){auto frame=take(wire::encode(metadata_fixture(),config().wire));std::ofstream out(argv[2],std::ios::binary);out.write(reinterpret_cast<const char*>(frame.data()),static_cast<std::streamsize>(frame.size()));CHECK(out.good());return 0;}CHECK(argc==1);const std::pair<const char*,void(*)()> tests[]={{"flat lossless metadata and malformed graph bounds",flat_metadata_is_lossless_and_bounded},{"bounded config and actual empty bootstrap",configuration_and_actual_bootstrap},{"pairing correlation writer and shutdown",pairing_correlation_and_writer},{"real gateway lifecycle and atomic native errors",real_mutations_and_atomic_native_errors},{"oversized read retains separately updated state",oversized_read_preserves_separately_updated_state}};int failures=0;for(auto[name,run]:tests){try{run();std::printf("PASS %s\n",name);}catch(const std::exception&e){++failures;std::printf("FAIL %s: %s\n",name,e.what());}}std::printf("%zu control cases, %d failed\n",std::size(tests),failures);return failures?1:0;}catch(const std::exception&e){std::fprintf(stderr,"Control fixture failure: %s\n",e.what());return 1;}}
