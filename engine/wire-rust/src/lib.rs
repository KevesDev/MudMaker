pub mod mudmaker {
    pub mod scripting { pub mod v1 { include!(concat!(env!("OUT_DIR"), "/mudmaker.scripting.v1.rs")); } }
    pub mod engine { pub mod v1 { include!(concat!(env!("OUT_DIR"), "/mudmaker.engine.v1.rs")); } }
}
pub use mudmaker::engine::v1 as pb;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ErrorCode { Policy, Frame, Protobuf, Version, Envelope, Identity, Value, Limit }
#[derive(Clone, Debug)]
pub struct Error { pub code: ErrorCode, pub path: String, pub reason: String }
#[derive(Clone, Copy, Debug)]
pub struct Policy {
    pub frame_bytes: usize, pub protobuf_recursion: usize, pub value_depth: usize,
    pub value_nodes: usize, pub text_bytes: usize,
}
impl Policy {
    pub fn load() -> Result<Self, Error> {
        Self::from_json(include_str!("../../../contracts/engine/v1/protocol-policy.json"))
    }
    pub fn from_json(text: &str) -> Result<Self, Error> {
        let reject = || Error { code: ErrorCode::Policy, path: "policy".into(), reason: "Invalid policy object/positive limits".into() };
        let value: serde_json::Value = serde_json::from_str(text).map_err(|_| reject())?;
        let object = value.as_object().ok_or_else(reject)?;
        if object.len() != 5 { return Err(reject()); }
        let read = |name| object.get(name).and_then(serde_json::Value::as_u64).filter(|value| *value <= 9_007_199_254_740_991).and_then(|value| usize::try_from(value).ok()).filter(|value| *value > 0).ok_or_else(reject);
        let policy = Self { frame_bytes: read("frame_bytes")?, protobuf_recursion: read("protobuf_recursion")?, value_depth: read("value_depth")?, value_nodes: read("value_nodes")?, text_bytes: read("text_bytes")? };
        policy.validate()?;
        Ok(policy)
    }
    pub fn validate(&self) -> Result<(), Error> {
        if self.frame_bytes == 0 || self.frame_bytes > i32::MAX as usize || self.protobuf_recursion != 100 || !(1..=32).contains(&self.value_depth) || self.value_nodes == 0 || self.text_bytes == 0 {
            return Err(error(ErrorCode::Policy, "policy", "Positive limits, fixed physical recursion100 and logical depth1..32 required"));
        }
        Ok(())
    }
}

use prost::Message;
use std::collections::BTreeSet;
use mudmaker::scripting::v1 as shared;
fn error(code: ErrorCode, path: &str, reason: &str) -> Error { Error { code, path: path.into(), reason: reason.into() } }
pub fn parse_guid(text: &str) -> Result<[u8;16], Error> {
    let reject = || error(ErrorCode::Identity, "guid", "Expected canonical nonzero lowercase8-4-4-4-12 GUID");
    let input = text.as_bytes(); if input.len() != 36 { return Err(reject()); }
    let mut bytes = [0;16]; let mut output = 0; let mut high = None;
    for (index, byte) in input.iter().copied().enumerate() {
        if [8,13,18,23].contains(&index) { if byte != b'-' { return Err(reject()); } continue; }
        let nibble = match byte { b'0'..=b'9' => byte - b'0', b'a'..=b'f' => byte - b'a' + 10, _ => return Err(reject()) };
        if let Some(first) = high { bytes[output] = first * 16 + nibble; output += 1; high = None; } else { high = Some(nibble); }
    }
    if bytes.iter().all(|byte| *byte == 0) { return Err(reject()); } Ok(bytes)
}
fn entity(value: &shared::EntityRef) -> Result<(), Error> {
    parse_guid(&value.world_id)?;
    if value.entity_id >= u32::MAX as u64 { return Err(error(ErrorCode::Identity, "entity.entity_id", "Index must fit below UINT32_MAX")); }
    Ok(())
}
struct Budget { policy: Policy, nodes: usize, bytes: usize }
impl Budget {
    fn enter(&mut self, depth: usize) -> Result<(), Error> {
        if depth > self.policy.value_depth || self.nodes >= self.policy.value_nodes { return Err(error(ErrorCode::Limit, "value", "Logical depth/node limit exceeded")); }
        self.nodes += 1; Ok(())
    }
    fn text(&mut self, text: &str) -> Result<(), Error> {
        if text.len() > self.policy.text_bytes || text.len() > self.policy.frame_bytes.saturating_sub(self.bytes) { return Err(error(ErrorCode::Limit, "text", "Text/frame byte limit exceeded")); }
        self.bytes += text.len(); Ok(())
    }
}
fn value_ok(value: &pb::EngineValue, budget: &mut Budget, depth: usize) -> Result<(), Error> {
    budget.enter(depth)?;
    match value.value.as_ref().ok_or_else(|| error(ErrorCode::Value, "value", "Missing/unknown EngineValue kind"))? {
        pb::engine_value::Value::Primitive(primitive) => {
            match primitive.value.as_ref().ok_or_else(|| error(ErrorCode::Value, "primitive", "Missing primitive kind"))? {
                shared::property_value::Value::BooleanValue(_) | shared::property_value::Value::IntegerValue(_) => (),
                shared::property_value::Value::FloatingValue(number) => if !number.is_finite() { return Err(error(ErrorCode::Value, "floating", "Floating value must be finite")); },
                shared::property_value::Value::TextValue(text) => budget.text(text)?,
                shared::property_value::Value::EntityValue(reference) => entity(reference)?,
                shared::property_value::Value::AssetValue(reference) => { parse_guid(&reference.id)?; if reference.revision == 0 { return Err(error(ErrorCode::Identity, "asset.revision", "Asset revision must be positive")); } },
                shared::property_value::Value::ExplicitNull(present) => if !present { return Err(error(ErrorCode::Value, "null", "Explicit Null requires true")); },
            }
        },
        pb::engine_value::Value::Record(record) => {
            if record.fields.len() > budget.policy.value_nodes - budget.nodes { return Err(error(ErrorCode::Limit, "record", "Record exceeds remaining node budget")); }
            let mut fields = BTreeSet::new();
            for field in &record.fields {
                if !fields.insert(parse_guid(&field.field_id)?) { return Err(error(ErrorCode::Value, "record.field_id", "Duplicate FieldId")); }
                value_check_child(field.value.as_ref(), budget, depth + 1)?;
            }
        },
        pb::engine_value::Value::List(list) => {
            if list.values.len() > budget.policy.value_nodes - budget.nodes { return Err(error(ErrorCode::Limit, "list", "List exceeds remaining node budget")); }
            for child in &list.values { value_ok(child, budget, depth + 1)?; }
        },
    }
    Ok(())
}
fn value_check_child(child: Option<&pb::EngineValue>, budget: &mut Budget, depth: usize) -> Result<(), Error> {
    value_ok(child.ok_or_else(|| error(ErrorCode::Value, "record.value", "Typed child is missing"))?, budget, depth)
}
pub fn validate(envelope: &pb::Envelope, policy: Policy) -> Result<(), Error> {
    policy.validate()?;
    let version = envelope.protocol.as_ref().ok_or_else(|| error(ErrorCode::Version, "protocol", "Protocol missing"))?;
    if version.major != 1 || version.minor != 0 { return Err(error(ErrorCode::Version, "protocol", "Only engine-control1.0 supported")); }
    if envelope.request_id == 0 { return Err(error(ErrorCode::Envelope, "request_id", "Request ID must be nonzero")); }
    parse_guid(&envelope.connection_id)?;
    let mut budget = Budget { policy, nodes: 0, bytes: 0 };
    match envelope.body.as_ref().ok_or_else(|| error(ErrorCode::Envelope, "body", "Missing/unknown envelope body"))? {
        pb::envelope::Body::Hello(hello) => {
            if hello.pairing_token.len() != 32 || hello.min_minor != 0 || hello.max_minor < hello.min_minor { return Err(error(ErrorCode::Envelope, "hello", "Token length/minor interval invalid")); }
        },
        pb::envelope::Body::HelloAck(ack) => {
            if ack.selected_minor != 0 || ack.engine_version.is_empty() { return Err(error(ErrorCode::Envelope, "hello_ack", "Selected minor/engine version invalid")); }
            parse_guid(&ack.world_id)?; budget.text(&ack.engine_version)?;
        },
        pb::envelope::Body::InspectEntity(request) => entity(request.entity.as_ref().ok_or_else(|| error(ErrorCode::Identity, "entity", "Entity missing"))?)?,
        pb::envelope::Body::EntityInspection(inspection) => {
            entity(inspection.entity.as_ref().ok_or_else(|| error(ErrorCode::Identity, "entity", "Entity missing"))?)?;
            let mut components = BTreeSet::new();
            for component in &inspection.components {
                if !components.insert(parse_guid(&component.component_type_id)?) || component.schema_revision == 0 { return Err(error(ErrorCode::Value, "component", "Duplicate component/invalid revision")); }
                let root = component.value.as_ref().ok_or_else(|| error(ErrorCode::Value, "component.value", "Value missing"))?;
                if !matches!(root.value, Some(pb::engine_value::Value::Record(_))) { return Err(error(ErrorCode::Value, "component.value", "Root must be a Record")); }
                value_ok(root, &mut budget, 1)?;
            }
        },
        pb::envelope::Body::Error(failure) => {
            if !(1..=9).contains(&failure.code) { return Err(error(ErrorCode::Envelope, "error.code", "Unknown/unspecified error kind")); }
            budget.text(&failure.message)?; budget.text(&failure.native_code)?;
            if let Some(id) = &failure.world_id { parse_guid(id)?; }
            if let Some(reference) = &failure.entity { entity(reference)?; }
            if let Some(id) = &failure.component_type_id { parse_guid(id)?; }
            if failure.schema_revision == Some(0) { return Err(error(ErrorCode::Value, "error.schema_revision", "Revision must be positive")); }
            for path in &failure.field_path { budget.text(path)?; }
        },
    }
    Ok(())
}
pub fn encode(envelope: &pb::Envelope, policy: Policy) -> Result<Vec<u8>, Error> {
    validate(envelope, policy)?;
    let length = envelope.encoded_len();
    if length == 0 || length > policy.frame_bytes { return Err(error(ErrorCode::Limit, "frame", "Encoded frame exceeds policy")); }
    let mut frame = Vec::with_capacity(length + 4); frame.extend_from_slice(&(length as u32).to_be_bytes());
    envelope.encode(&mut frame).map_err(|_| error(ErrorCode::Protobuf, "frame", "Serialization failed"))?; Ok(frame)
}
pub fn decode(frame: &[u8], policy: Policy) -> Result<pb::Envelope, Error> {
    policy.validate()?;
    if frame.len() < 4 { return Err(error(ErrorCode::Frame, "frame", "Incomplete prefix")); }
    let length = u32::from_be_bytes(frame[..4].try_into().unwrap()) as usize;
    if length == 0 || length > policy.frame_bytes || frame.len() - 4 != length { return Err(error(ErrorCode::Frame, "frame", "Zero/oversized/incomplete/trailing payload")); }
    // Pinned prost's default physical guard is100; no custom parser or disabled limit.
    let envelope = pb::Envelope::decode(&frame[4..]).map_err(|failure| error(ErrorCode::Protobuf, "frame", &failure.to_string()))?;
    validate(&envelope, policy)?; Ok(envelope)
}
