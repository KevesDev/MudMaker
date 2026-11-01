use super::*;
use crate::test_scratch::Scratch;
use mudmaker_engine_wire::{self as wire,mudmaker::scripting::v1 as shared};
use pb::envelope::Body;
use std::{fs,path::Path};
fn fixture()->Paths{let mut paths=Locator::Development.resolve().expect("trusted development paths");paths.executable=std::env::var_os("MUDMAKER_ENGINE_TEST_EXE").expect("assigned actual native executable").into();paths.validate().unwrap();paths}
fn owner()->EngineOwner{EngineOwner::launch_paths(fixture()).expect("actual paired native World")}
fn operation(owner:&EngineOwner,request:Request)->Body{owner.try_request(request).expect("one admission").wait().expect("native response")}
fn catalog(owner:&EngineOwner)->pb::ComponentSchemaInfo{match operation(owner,Request::Catalog(pb::CatalogRequest{offset:0,limit:1})){Body::CatalogResult(mut c)=>{assert_eq!(c.total,1);let s=c.schemas.remove(0);assert_eq!(s.name,"mudmaker.core.named");s},other=>panic!("catalog response {other:?}")}}
fn primitive(value:shared::property_value::Value)->pb::EngineValue{pb::EngineValue{value:Some(pb::engine_value::Value::Primitive(shared::PropertyValue{value:Some(value)}))}}
fn text(value:impl Into<String>)->pb::EngineValue{primitive(shared::property_value::Value::TextValue(value.into()))}
fn create(owner:&EngineOwner,schema:&pb::ComponentSchemaInfo,fields:Vec<pb::RecordField>)->shared::EntityRef{match operation(owner,Request::Create(pb::CreateEntityRequest{components:vec![pb::ComponentValue{component_type_id:schema.component_type_id.clone(),schema_revision:schema.schema_revision,value:Some(pb::EngineValue{value:Some(pb::engine_value::Value::Record(pb::RecordValue{fields}))})}]})){Body::CreateEntityResult(r)=>r.entity.unwrap(),r=>panic!("create {r:?}")}}
fn field_request(schema:&pb::ComponentSchemaInfo,entity:&shared::EntityRef,name:&str,value:pb::EngineValue)->Request{Request::Field(pb::ReplaceFieldRequest{entity:Some(entity.clone()),component_type_id:schema.component_type_id.clone(),schema_revision:schema.schema_revision,field_id:schema.fields.iter().find(|f|f.name==name).unwrap().field_id.clone(),value:Some(value)})}
fn inspected(owner:&EngineOwner,entity:&shared::EntityRef)->pb::EntityInspection{match operation(owner,Request::Inspect(pb::InspectEntity{entity:Some(entity.clone())})){Body::EntityInspection(v)=>v,r=>panic!("inspect {r:?}")}}
fn stored<'a>(inspection:&'a pb::EntityInspection,id:&str)->&'a pb::EngineValue{let fields=match &inspection.components[0].value.as_ref().unwrap().value{Some(pb::engine_value::Value::Record(r))=>&r.fields,_=>panic!("Record")};fields.iter().find(|f|f.field_id==id).unwrap().value.as_ref().unwrap()}
fn copied_settings(scratch:&Scratch,edit:impl FnOnce(&mut serde_json::Value))->Paths{let mut paths=fixture();let mut json:serde_json::Value=serde_json::from_slice(&fs::read(&paths.runtime).unwrap()).unwrap();edit(&mut json);paths.runtime=scratch.0.join("runtime.json");fs::write(&paths.runtime,serde_json::to_vec(&json).unwrap()).unwrap();paths}
fn ready_completion(completion:&Completion,budget:Duration){let deadline=Instant::now()+budget;let mut state=completion.state.lock().unwrap();while !state.complete{let left=deadline.saturating_duration_since(Instant::now());assert!(!left.is_zero(),"real operation completed within configured bound");state=completion.changed.wait_timeout(state,left).unwrap().0;}}
#[test]
fn locator_and_shared_configuration_fail_before_spawn(){
 assert!(Locator::Development.resolve().unwrap().executable.ends_with(Path::new("engine/build/s03-wire-33-release/Release/mudmaker-engine.exe")));
 let scratch=Scratch::new("engine-owner-config");assert!(Locator::Resources(scratch.0.clone()).resolve().is_err());
 let paths=copied_settings(&scratch,|v|{v["unknown"]=1.into();});assert!(EngineOwner::launch_paths(paths).is_err());
 let paths=copied_settings(&scratch,|v|{v.as_object_mut().unwrap().remove("hello_timeout_ms");});assert!(Configuration::load(&paths).is_err());
 let paths=copied_settings(&scratch,|v|{v["cancel_drain_timeout_ms"]=u32::MAX.into();});assert!(Configuration::load(&paths).is_err());
 let paths=copied_settings(&scratch,|_|{});fs::write(&paths.runtime,vec![b' ';config::CONFIGURATION_BYTES+1]).unwrap();assert_eq!(Configuration::load(&paths).err().unwrap().code,"configuration_too_large");
 assert!(wire::frame_length(&[0,0,0,0],wire::Policy::load().unwrap()).is_err());
}
#[test]
fn actual_native_values_domain_rejection_and_graceful_exit(){
 let mut owner=owner();let status=owner.status();assert_eq!(status.lifecycle,Lifecycle::Ready);wire::parse_guid(status.world_id.as_ref().unwrap()).unwrap();let schema=catalog(&owner);let entity=create(&owner,&schema,vec![]);assert_eq!(Some(&entity.world_id),status.world_id.as_ref());
 assert!(matches!(operation(&owner,field_request(&schema,&entity,"name",text("Rust parent actual World"))),Body::MutationAck(_)));
 let name=&schema.fields.iter().find(|f|f.name=="name").unwrap().field_id;let before=inspected(&owner,&entity);assert_eq!(stored(&before,name),&text("Rust parent actual World"));
 let rejected=operation(&owner,field_request(&schema,&entity,"name",primitive(shared::property_value::Value::IntegerValue(7))));match rejected{Body::Error(e)=>{assert_eq!(e.native_code,"world.schema/schema.wrong_type");assert_eq!(e.entity,Some(entity.clone()));},r=>panic!("native rejection {r:?}")}
 assert_eq!(owner.status().lifecycle,Lifecycle::Ready);assert_eq!(inspected(&owner,&entity),before);
 match operation(&owner,Request::List(pb::ListEntitiesRequest{offset:0,limit:1})){Body::ListEntitiesResult(r)=>assert_eq!(r.entities,vec![entity.clone()]),r=>panic!("list {r:?}")}
 assert!(matches!(operation(&owner,Request::Destroy(pb::DestroyEntityRequest{entity:Some(entity)})),Body::MutationAck(_)));
 let report=owner.shutdown(ShutdownMode::Graceful);assert_eq!(report.kind,ShutdownKind::Graceful);assert_eq!(report.raw_exit,Some(0));assert_eq!(owner.status().lifecycle,Lifecycle::Stopped);assert!(owner.status().world_id.is_none());
}
#[test]
fn one_outstanding_includes_uncollected_reply_and_active_drop(){
 let mut owner=owner();let pending=owner.try_request(Request::Catalog(pb::CatalogRequest{offset:0,limit:1})).unwrap();ready_completion(&pending.completion,owner.configuration.completion_budget());assert!(matches!(owner.try_request(Request::List(pb::ListEntitiesRequest{offset:0,limit:1})),Err(Error{code:"busy",..})));let schema=match pending.wait().unwrap(){Body::CatalogResult(mut c)=>c.schemas.remove(0),_=>panic!("catalog")};
 let fields=schema.fields.iter().map(|f|pb::RecordField{field_id:f.field_id.clone(),value:Some(text("x".repeat(200_000)))}).collect();
 let request=Request::Create(pb::CreateEntityRequest{components:vec![pb::ComponentValue{component_type_id:schema.component_type_id.clone(),schema_revision:1,value:Some(pb::EngineValue{value:Some(pb::engine_value::Value::Record(pb::RecordValue{fields}))})}]});
 let pending=owner.try_request(request).unwrap();let completion=pending.completion.clone();drop(pending);
 {let state=completion.state.lock().unwrap();if !state.complete{assert!(owner.core.permit.load(Ordering::Acquire));assert!(matches!(owner.try_request(Request::List(pb::ListEntitiesRequest{offset:0,limit:1})),Err(Error{code:"busy",..})));}}
 ready_completion(&completion,owner.configuration.completion_budget());match operation(&owner,Request::List(pb::ListEntitiesRequest{offset:0,limit:1})){Body::ListEntitiesResult(r)=>assert_eq!(r.total,1),r=>panic!("real dropped request reached native {r:?}")}
 assert_eq!(owner.shutdown(ShutdownMode::Graceful).kind,ShutdownKind::Graceful);
}
#[test]
fn actual_child_death_immediate_stop_and_drop_are_bounded(){
 let mut dead=owner();unsafe{TerminateProcess(os::handle(dead.core.process.as_ref()),ERROR_PROCESS_ABORTED.0)}.unwrap();assert_eq!(os::wait(dead.core.process.as_ref(),dead.configuration.runtime.process_exit_timeout_ms),WAIT_OBJECT_0);assert_eq!(dead.status().lifecycle,Lifecycle::Failed);assert_eq!(dead.status().failure.unwrap().raw_exit,Some(ERROR_PROCESS_ABORTED.0));assert!(matches!(dead.try_request(Request::List(pb::ListEntitiesRequest{offset:0,limit:1})),Err(Error{code:"not_ready",..})));assert_eq!(dead.shutdown(ShutdownMode::Immediate).kind,ShutdownKind::Failed);
 let mut immediate=owner();let report=immediate.shutdown(ShutdownMode::Immediate);assert_eq!(report.kind,ShutdownKind::Forced);assert_eq!(report.raw_exit,Some(ERROR_PROCESS_ABORTED.0));assert_eq!(immediate.status().lifecycle,Lifecycle::Stopped);
 let dropping=owner();let process=dropping.core.process.clone();let timeout=dropping.configuration.runtime.process_exit_timeout_ms;let pending=dropping.try_request(Request::Create(pb::CreateEntityRequest{components:vec![]})).unwrap();let completion=pending.completion.clone();drop(dropping);assert_eq!(os::wait(process.as_ref(),timeout),WAIT_OBJECT_0);assert!(completion.state.lock().unwrap().complete);let _actual_result=pending.wait();
}
#[test]
fn real_response_frame_boundary_preserves_native_state_and_ready(){
 let scratch=Scratch::new("engine-owner-frame");let paths=copied_settings(&scratch,|v|{v["minimum_control_frame_bytes"]=2048.into();v["pipe_buffer_bytes"]=2048.into();});let mut paths=paths;let mut policy:serde_json::Value=serde_json::from_slice(&fs::read(&paths.wire).unwrap()).unwrap();policy["frame_bytes"]=2048.into();paths.wire=scratch.0.join("wire.json");fs::write(&paths.wire,serde_json::to_vec(&policy).unwrap()).unwrap();let mut owner=EngineOwner::launch_paths(paths).unwrap();let schema=catalog(&owner);let entity=create(&owner,&schema,vec![]);
 for name in ["name","description"]{assert!(matches!(operation(&owner,field_request(&schema,&entity,name,text("x".repeat(1200)))),Body::MutationAck(_)));}
 match operation(&owner,Request::Inspect(pb::InspectEntity{entity:Some(entity.clone())})){Body::Error(e)=>assert_eq!(e.native_code,"control.response_too_large"),r=>panic!("bounded native response {r:?}")};assert_eq!(owner.status().lifecycle,Lifecycle::Ready);
 assert!(matches!(operation(&owner,field_request(&schema,&entity,"name",text("retained"))),Body::MutationAck(_)));let after=inspected(&owner,&entity);let description=&schema.fields.iter().find(|f|f.name=="description").unwrap().field_id;assert_eq!(stored(&after,description),&text("x".repeat(1200)));
 let invalid=owner.try_request(field_request(&schema,&entity,"name",text("x".repeat(3000)))).unwrap().wait().unwrap_err();assert_eq!(invalid.code,"request_invalid");assert_eq!(invalid.outcome,Outcome::None);assert_eq!(owner.status().lifecycle,Lifecycle::Ready);assert_eq!(owner.shutdown(ShutdownMode::Graceful).kind,ShutdownKind::Graceful);
}
