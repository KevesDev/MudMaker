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


struct NativeSession {
    child: std::process::Child,
    policy: Policy,
    next: u64,
}
impl NativeSession {
    fn start(engine: &Path) -> Self {
        let exe = env::var_os("MUDMAKER_CONTROL_CPP_TEST_EXE").expect("assigned real C++ control test executable");
        let mut paths = vec![engine.join(".deps/vcpkg_installed_33_release/x64-windows-cxx20/bin")];
        paths.extend(env::split_paths(&env::var_os("PATH").unwrap_or_default()));
        let child = Command::new(exe).arg("--session").env("PATH", env::join_paths(paths).unwrap())
            .stdin(std::process::Stdio::piped()).stdout(std::process::Stdio::piped()).stderr(std::process::Stdio::inherit()).spawn().unwrap();
        Self { child, policy: Policy::load().unwrap(), next: 0 }
    }
    fn exchange(&mut self, body: pb::envelope::Body) -> pb::Envelope {
        use std::io::{Read, Write};
        self.next += 1;
        let request = pb::Envelope { protocol: Some(pb::ProtocolVersion { major: 1, minor: 0 }), request_id: self.next,
            connection_id: "00112233-4455-6677-8899-aabbccddeeff".into(), body: Some(body) };
        let bytes = encode(&request, self.policy).unwrap();
        let input = self.child.stdin.as_mut().unwrap(); input.write_all(&bytes).unwrap(); input.flush().unwrap();
        let output = self.child.stdout.as_mut().unwrap(); let mut prefix = [0u8; 4]; output.read_exact(&mut prefix).unwrap();
        let size = u32::from_be_bytes(prefix) as usize; assert!(size > 0 && size <= self.policy.frame_bytes);
        let mut frame = prefix.to_vec(); frame.resize(size + prefix.len(), 0); output.read_exact(&mut frame[4..]).unwrap();
        let reply = decode(&frame, self.policy).unwrap(); assert_eq!(reply.request_id, request.request_id); assert_eq!(reply.connection_id, request.connection_id); reply
    }
}
impl Drop for NativeSession { fn drop(&mut self) { let _ = self.child.kill(); let _ = self.child.wait(); } }
fn control_text(value: &str) -> pb::EngineValue {
    pb::EngineValue { value: Some(Value::Primitive(mudmaker_engine_wire::mudmaker::scripting::v1::PropertyValue { value: Some(Primitive::TextValue(value.into())) })) }
}
#[test]
fn actual_native_control_session_and_lossless_flat_metadata() {
    use pb::envelope::Body;
    let (engine, _, destination) = fixture_paths(); let mut session = NativeSession::start(&engine);
    let hello = session.exchange(Body::Hello(pb::Hello { pairing_token: vec![0x5a; 32], min_minor: 0, max_minor: 0 }));
    let world = match hello.body.unwrap() { Body::HelloAck(a) => { assert!(!a.engine_version.is_empty()); a.world_id }, _ => panic!("real native Ack") };
    let cat = session.exchange(Body::CatalogRequest(pb::CatalogRequest { offset: 0, limit: 1 }));
    let catalog = match cat.body.unwrap() { Body::CatalogResult(c) => c, _ => panic!("catalog") };
    assert_eq!(catalog.total, 1); assert_eq!(catalog.schemas[0].name, "mudmaker.core.named"); assert_eq!(catalog.schemas[0].persistence, pb::Persistence::Persistent as i32);
    const NAMED: &str = "efbeba2d-21cd-4df8-a757-d96e53f8380c";
    const NAME: &str = "dea816fc-0ae4-4eac-b02a-a1596450f93a";
    assert_eq!(catalog.schemas[0].component_type_id, NAMED); assert_eq!(catalog.schemas[0].fields[0].field_id, NAME);
    assert!(catalog.schemas[0].fields[0].default_value.is_some()); assert!(catalog.schemas[0].fields[1].default_value.is_none());
    let create = session.exchange(Body::CreateEntityRequest(pb::CreateEntityRequest { components: vec![pb::ComponentValue { component_type_id: NAMED.into(), schema_revision: 1, value: Some(pb::EngineValue { value: Some(Value::Record(pb::RecordValue { fields: vec![] })) }) }] }));
    let entity = match create.body.unwrap() { Body::CreateEntityResult(r) => r.entity.unwrap(), _ => panic!("created actual entity") }; assert_eq!(entity.world_id, world);
    let request = pb::ReplaceFieldRequest { entity: Some(entity.clone()), component_type_id: NAMED.into(), schema_revision: 1, field_id: NAME.into(), value: Some(control_text("from Rust session")) };
    let mutation = session.exchange(Body::ReplaceFieldRequest(request.clone())); match mutation.body.unwrap() { Body::MutationAck(a) => assert_eq!(a.entity.as_ref(), Some(&entity)), _ => panic!("native mutation Ack") }
    let inspected = session.exchange(Body::InspectEntity(pb::InspectEntity { entity: Some(entity.clone()) }));
    let actual = match inspected.body.unwrap() { Body::EntityInspection(i) => i, _ => panic!("inspection") }; assert_eq!(actual.entity.as_ref(), Some(&entity)); assert_eq!(actual.components[0].component_type_id, NAMED);
    let fields = record(actual.components[0].value.as_ref().unwrap()); let name = fields.fields.iter().find(|f| f.field_id == NAME).unwrap().value.as_ref().unwrap(); assert_eq!(primitive(name), &Primitive::TextValue("from Rust session".into()));
    let mut wrong = request; wrong.value = Some(pb::EngineValue { value: Some(Value::Primitive(mudmaker_engine_wire::mudmaker::scripting::v1::PropertyValue { value: Some(Primitive::IntegerValue(7)) })) });
    let rejection = session.exchange(Body::ReplaceFieldRequest(wrong)); match rejection.body.unwrap() { Body::Error(e) => { assert_eq!(e.native_code, "world.schema/schema.wrong_type"); assert_eq!(e.entity.as_ref(), Some(&entity)); assert_eq!(e.field_path.first().map(String::as_str), Some(NAME)); }, _ => panic!("real native schema rejection") }
    let after = session.exchange(Body::InspectEntity(pb::InspectEntity { entity: Some(entity) })); match after.body.unwrap() { Body::EntityInspection(i) => assert_eq!(i, actual), _ => panic!("state retained") }
    assert!(matches!(session.exchange(Body::ShutdownRequest(pb::ShutdownRequest {})).body, Some(Body::ShutdownAck(_)))); assert!(session.child.wait().unwrap().success());
    // A real immutable native fixture exercises every kind/optional metadata, beyond the two production Text fields.
    let executable = env::var_os("MUDMAKER_CONTROL_CPP_TEST_EXE").unwrap(); let status = Command::new(executable).arg("--write-metadata").arg(&destination).status().unwrap(); assert!(status.success());
    let bytes = fs::read(&destination).unwrap(); let metadata = decode(&bytes, session.policy).unwrap(); let catalog = match metadata.body.as_ref().unwrap() { Body::CatalogResult(c) => c, _ => panic!("metadata file") }; let schema = &catalog.schemas[0];
    assert_eq!(schema.fields.len(), 9); assert_eq!(schema.persistence, pb::Persistence::Persistent as i32);
    for (index, expected) in [pb::ValueKind::Boolean, pb::ValueKind::Integer, pb::ValueKind::Floating, pb::ValueKind::Text, pb::ValueKind::Entity, pb::ValueKind::Asset, pb::ValueKind::Record, pb::ValueKind::List].iter().enumerate() {
        assert_eq!(schema.types.iter().find(|t| t.type_id == schema.fields[index].type_id).unwrap().kind, *expected as i32);
    }
    let number = schema.types.iter().find(|t| t.type_id == schema.fields[1].type_id).unwrap().constraints.as_ref().unwrap(); assert_eq!(number.integer_min, Some(i64::MIN)); assert_eq!(number.integer_max, Some(i64::MAX)); assert_eq!(number.enum_values.len(), 2);
    assert_eq!(primitive(schema.fields[3].default_value.as_ref().unwrap()), &Primitive::ExplicitNull(true)); assert!(schema.fields[8].default_value.is_none());
    let mutate = |edit: fn(&mut pb::ComponentSchemaInfo), expected| { let mut bad = metadata.clone(); if let Some(Body::CatalogResult(c)) = &mut bad.body { edit(&mut c.schemas[0]); } assert_eq!(encode(&bad, session.policy).unwrap_err().code, expected); };
    mutate(|s|s.fields[0].type_id=999, ErrorCode::Value); mutate(|s|s.fields[0].field_id.clear(), ErrorCode::Identity);
    mutate(|s|s.types[0].kind=0, ErrorCode::Value); mutate(|s|s.types[0].constraints.as_mut().unwrap().floating_min=Some(f64::NAN), ErrorCode::Value);
    mutate(|s|s.fields[0].default_value.as_mut().unwrap().value=None, ErrorCode::Value);
    mutate(|s|{s.types[0].kind=pb::ValueKind::List as i32;s.types[0].element_type_id=s.types[0].type_id;}, ErrorCode::Value);
    mutate(|s|s.types[1].type_id=s.types[0].type_id, ErrorCode::Value);
    let mut small=session.policy;small.value_nodes=1;assert_eq!(encode(&metadata,small).unwrap_err().code, ErrorCode::Limit);
}
