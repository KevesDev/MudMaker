use mudmaker_engine_wire::{decode, encode, pb, ErrorCode, Policy};
use mudmaker_engine_wire::mudmaker::scripting::v1::property_value::Value as Primitive;
use pb::engine_value::Value as Value;
use std::{env, fs, path::{Path, PathBuf}, process::Command};

fn field_id(id: u8) -> String { format!("00000000-0000-0000-0000-{id:012x}") }
fn record(value: &pb::EngineValue) -> &pb::RecordValue { match value.value.as_ref().unwrap() { Value::Record(record) => record, _ => panic!("expected Record") } }
fn record_mut(value: &mut pb::EngineValue) -> &mut pb::RecordValue { match value.value.as_mut().unwrap() { Value::Record(record) => record, _ => panic!("expected Record") } }
fn component(envelope: &pb::Envelope) -> &pb::ComponentValue { match envelope.body.as_ref().unwrap() { pb::envelope::Body::EntityInspection(inspection) => &inspection.components[0], _ => panic!("expected inspection") } }
fn root(envelope: &pb::Envelope) -> &pb::RecordValue { record(component(envelope).value.as_ref().unwrap()) }
fn root_mut(envelope: &mut pb::Envelope) -> &mut pb::RecordValue {
    match envelope.body.as_mut().unwrap() { pb::envelope::Body::EntityInspection(inspection) => record_mut(inspection.components[0].value.as_mut().unwrap()), _ => panic!("expected inspection") }
}
fn field(record: &pb::RecordValue, id: u8) -> &pb::EngineValue { record.fields.iter().find(|field| field.field_id == field_id(id)).unwrap().value.as_ref().unwrap() }
fn field_mut(record: &mut pb::RecordValue, id: u8) -> &mut pb::EngineValue { record.fields.iter_mut().find(|field| field.field_id == field_id(id)).unwrap().value.as_mut().unwrap() }
fn primitive(value: &pb::EngineValue) -> &Primitive { match value.value.as_ref().unwrap() { Value::Primitive(primitive) => primitive.value.as_ref().unwrap(), _ => panic!("expected primitive") } }
fn set_primitive(value: &mut pb::EngineValue, replacement: Primitive) { match value.value.as_mut().unwrap() { Value::Primitive(primitive) => primitive.value = Some(replacement), _ => panic!("expected primitive") } }
fn fixture_paths() -> (PathBuf, PathBuf, PathBuf) {
    let engine = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf();
    let directory = engine.join("build/s03-wire-33-release/interop"); fs::create_dir_all(&directory).unwrap();
    (engine, directory.join("cpp.frame"), directory.join("rust.frame"))
}
fn cpp(mode: &str, path: &Path, engine: &Path) {
    let executable = env::var_os("MUDMAKER_WIRE_CPP_TEST_EXE").expect("assigned C++ executable environment required");
    let mut paths = vec![engine.join(".deps/vcpkg_installed_33_release/x64-windows-cxx20/bin")];
    paths.extend(env::split_paths(&env::var_os("PATH").unwrap_or_default()));
    let output = Command::new(executable).arg(mode).arg(path).env("PATH", env::join_paths(paths).unwrap()).output().expect("launch actual compiled C++ fixture codec");
    assert!(output.status.success(), "C++ fixture failed: {}", String::from_utf8_lossy(&output.stderr));
}
fn produced_fixture() -> (pb::Envelope, Vec<u8>) {
    let (engine, source, _) = fixture_paths(); cpp("--write-fixture", &source, &engine);
    let bytes = fs::read(source).unwrap(); let envelope = decode(&bytes, Policy::load().unwrap()).unwrap(); (envelope, bytes)
}

#[test]
fn actual_cpp_rust_cpp_semantic_roundtrip_and_deepest_supported_boundary() {
    let (mut envelope, _) = produced_fixture();
    assert_eq!(envelope.request_id, u64::MAX);
    assert_eq!(envelope.connection_id, "00112233-4455-6677-8899-aabbccddeeff");
    let inspection = match envelope.body.as_ref().unwrap() { pb::envelope::Body::EntityInspection(value) => value, _ => unreachable!() };
    let entity = inspection.entity.as_ref().unwrap();
    assert_eq!((&entity.world_id, entity.entity_id, entity.generation), (&"00112233-4455-6677-8899-aabbccddeeff".to_string(), 4294967294, u32::MAX));
    assert_eq!(component(&envelope).component_type_id, "11112233-4455-6677-8899-aabbccddeeff");
    let fields = root(&envelope);
    assert_eq!(primitive(field(fields, 1)), &Primitive::TextValue("from C++".into()));
    assert_eq!(primitive(field(fields, 2)), &Primitive::IntegerValue(i64::MIN));
    assert_eq!(primitive(field(fields, 3)), &Primitive::IntegerValue(i64::MAX));
    assert_eq!(primitive(field(fields, 4)), &Primitive::BooleanValue(true));
    assert_eq!(primitive(field(fields, 5)), &Primitive::FloatingValue(1.25));
    assert_eq!(primitive(field(fields, 6)), &Primitive::EntityValue(entity.clone()));
    match primitive(field(fields, 7)) { Primitive::AssetValue(asset) => { assert_eq!(asset.id, "ffeeddcc-bbaa-9988-7766-554433221100"); assert_eq!(asset.revision, 7); }, _ => panic!("asset") }
    assert_eq!(primitive(field(fields, 8)), &Primitive::ExplicitNull(true));
    assert!(!fields.fields.iter().any(|field| field.field_id == field_id(9)));
    let nested = record(field(fields, 10));
    assert_eq!(primitive(field(nested, 11)), &Primitive::IntegerValue(7));
    assert_eq!(primitive(field(nested, 12)), &Primitive::TextValue("nested".into()));
    match field(fields, 13).value.as_ref().unwrap() { Value::List(list) => {
        assert_eq!(primitive(&list.values[0]), &Primitive::TextValue("first".into()));
        assert_eq!(primitive(&list.values[1]), &Primitive::TextValue("second".into()));
    }, _ => panic!("list") }
    let mut deep = field(fields, 20);
    for id in 21..=50 { let next = record(deep); assert_eq!(next.fields.len(), 1); deep = field(next, id); }
    assert_eq!(primitive(deep), &Primitive::IntegerValue(777)); // root+30 Records+primitive = depth32
    let mut smaller = Policy::load().unwrap(); smaller.value_depth = 31;
    assert_eq!(encode(&envelope, smaller).unwrap_err().code, ErrorCode::Limit);
    set_primitive(field_mut(root_mut(&mut envelope), 1), Primitive::TextValue("from Rust".into()));
    set_primitive(field_mut(root_mut(&mut envelope), 2), Primitive::IntegerValue(42));
    set_primitive(field_mut(record_mut(field_mut(root_mut(&mut envelope), 10)), 11), Primitive::IntegerValue(-17));
    let (engine, _, destination) = fixture_paths();
    fs::write(&destination, encode(&envelope, Policy::load().unwrap()).unwrap()).unwrap();
    cpp("--read-mutated", &destination, &engine); // asserts the exact changed native values
}

#[test]
fn independent_bounded_failure_families() {
    let (envelope, bytes) = produced_fixture(); let policy = Policy::load().unwrap();
    assert_eq!(decode(&[], policy).unwrap_err().code, ErrorCode::Frame);
    assert_eq!(decode(&[0,0,0,0], policy).unwrap_err().code, ErrorCode::Frame);
    assert_eq!(decode(&bytes[..bytes.len()-1], policy).unwrap_err().code, ErrorCode::Frame);
    let mut trailing = bytes.clone(); trailing.push(0); assert_eq!(decode(&trailing, policy).unwrap_err().code, ErrorCode::Frame);
    assert_eq!(decode(&[0,0,0,1,0xff], policy).unwrap_err().code, ErrorCode::Protobuf);
    let mut message = envelope.clone(); message.protocol.as_mut().unwrap().major = 2; assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Version);
    message = envelope.clone(); message.body = None; assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Envelope);
    message = envelope.clone(); let duplicate = root(&message).fields[0].clone(); root_mut(&mut message).fields.push(duplicate); assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Value);
    message = envelope.clone(); field_mut(root_mut(&mut message), 1).value = None; assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Value);
    message = envelope.clone(); set_primitive(field_mut(root_mut(&mut message), 5), Primitive::FloatingValue(f64::INFINITY)); assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Value);
    message = envelope.clone(); set_primitive(field_mut(root_mut(&mut message), 8), Primitive::ExplicitNull(false)); assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Value);
    message = envelope.clone(); root_mut(&mut message).fields[0].field_id = "malformed".into(); assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Identity);
    message = envelope.clone(); if let pb::envelope::Body::EntityInspection(value) = message.body.as_mut().unwrap() { value.entity.as_mut().unwrap().entity_id = u32::MAX as u64; } assert_eq!(encode(&message, policy).unwrap_err().code, ErrorCode::Identity);
    let mut bounds = policy; bounds.protobuf_recursion = 99; assert_eq!(decode(&bytes, bounds).unwrap_err().code, ErrorCode::Policy);
    bounds = policy; bounds.value_depth = 33; assert_eq!(encode(&envelope, bounds).unwrap_err().code, ErrorCode::Policy);
    bounds = policy; bounds.value_nodes = 2; assert_eq!(decode(&bytes, bounds).unwrap_err().code, ErrorCode::Limit);
    bounds = policy; bounds.text_bytes = 3; assert_eq!(encode(&envelope, bounds).unwrap_err().code, ErrorCode::Limit);
    bounds = policy; bounds.frame_bytes = 1; assert_eq!(decode(&bytes, bounds).unwrap_err().code, ErrorCode::Frame);
    assert!(Policy::from_json("{}").is_err());
}
