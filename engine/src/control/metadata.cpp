#include "mudmaker/control/session.h"
#include <algorithm>
#include <functional>
#include <limits>
namespace mudmaker::control {
namespace {
namespace pb = wire::pb;
struct Failed { wire::Error error; };
template <typename T> T take(wire::Result<T> value) { if (auto e = std::get_if<wire::Error>(&value)) throw Failed{*e}; return std::move(std::get<T>(value)); }
pb::ValueKind kind(ecs::FieldKind value) {
  switch (value) {
    case ecs::FieldKind::Boolean: return pb::VALUE_KIND_BOOLEAN; case ecs::FieldKind::Integer: return pb::VALUE_KIND_INTEGER;
    case ecs::FieldKind::Floating: return pb::VALUE_KIND_FLOATING; case ecs::FieldKind::Text: return pb::VALUE_KIND_TEXT;
    case ecs::FieldKind::Entity: return pb::VALUE_KIND_ENTITY; case ecs::FieldKind::Asset: return pb::VALUE_KIND_ASSET;
    case ecs::FieldKind::Record: return pb::VALUE_KIND_RECORD; case ecs::FieldKind::List: return pb::VALUE_KIND_LIST;
  } throw Failed{{wire::ErrorCode::Value,"kind","Unknown native kind."}};
}
}
wire::Result<pb::CatalogResult> schema_metadata(const ecs::ComponentCatalogPage& page, std::span<const ecs::ComponentBinding> bindings, const wire::Policy& policy) {
  try {
    auto context = take(wire::ConversionContext::create(policy)); pb::CatalogResult out; out.set_total(page.total);
    if (page.next_offset) out.set_next_offset(*page.next_offset);
    std::size_t nodes = 0;
    for (const auto& schema : page.schemas) {
      if (!schema) throw Failed{{wire::ErrorCode::Value,"schema","Missing immutable descriptor."}};
      const auto binding = std::find_if(bindings.begin(), bindings.end(), [&](const auto& b){ return b.id == schema->id && b.revision == schema->revision; });
      if (binding == bindings.end()) throw Failed{{wire::ErrorCode::Value,"binding","Metadata release binding missing."}};
      auto* target = out.add_schemas(); target->set_component_type_id(wire::guid(schema->id.bytes())); target->set_schema_revision(schema->revision);
      target->set_name(schema->name); target->set_display(schema->display); target->set_description(schema->description);
      target->set_persistence(schema->persistence == ecs::PersistenceMode::Persistent ? pb::PERSISTENCE_PERSISTENT : pb::PERSISTENCE_TRANSIENT);
      const auto placement = binding->placement == ecs::StoragePlacement::Automatic ? (schema->fields.empty() ? ecs::StoragePlacement::Sparse : ecs::StoragePlacement::Archetype) : binding->placement;
      target->set_placement(placement == ecs::StoragePlacement::Sparse ? pb::PLACEMENT_SPARSE : pb::PLACEMENT_ARCHETYPE);
      std::function<std::uint32_t(const ecs::ValueSchema&,std::size_t)> type;
      std::function<pb::FieldInfo(const ecs::FieldSchema&,std::size_t)> field;
      field = [&](const ecs::FieldSchema& f,std::size_t depth) {
        pb::FieldInfo value; value.set_field_id(wire::guid(f.id.bytes())); value.set_name(f.name); value.set_required(f.required);
        value.set_display(f.display); value.set_description(f.description); value.set_type_id(type(*f.type,depth));
        if (f.default_value) *value.mutable_default_value() = take(context->wire_value(*f.default_value,*f.type)); return value;
      };
      type = [&](const ecs::ValueSchema& t,std::size_t depth) -> std::uint32_t {
        if (++nodes > policy.value_nodes || depth > policy.value_depth || target->types_size() == std::numeric_limits<int>::max()) throw Failed{{wire::ErrorCode::Limit,"types","Metadata graph exceeds policy."}};
        const int index = target->types_size(); target->add_types(); pb::TypeInfo value; value.set_type_id(static_cast<std::uint32_t>(index)+1);
        value.set_kind(kind(t.kind)); value.set_nullable(t.nullable); auto* c=value.mutable_constraints(); const auto& n=t.constraints;
        if(n.integer_min)c->set_integer_min(*n.integer_min); if(n.integer_max)c->set_integer_max(*n.integer_max);
        if(n.floating_min)c->set_floating_min(*n.floating_min); if(n.floating_max)c->set_floating_max(*n.floating_max);
        if(n.text_min_bytes)c->set_text_min_bytes(*n.text_min_bytes); if(n.text_max_bytes)c->set_text_max_bytes(*n.text_max_bytes);
        if(n.list_min_items)c->set_list_min_items(*n.list_min_items); if(n.list_max_items)c->set_list_max_items(*n.list_max_items);
        for(const auto& e:n.enum_values)*c->add_enum_values()=take(context->wire_value(e,t));
        for(const auto& f:t.fields)*value.add_fields()=field(f,depth+1);
        if(t.element)value.set_element_type_id(type(*t.element,depth+1));
        const auto id=value.type_id(); *target->mutable_types(index)=std::move(value); return id;
      };
      for(const auto& f:schema->fields)*target->add_fields()=field(f,1);
    }
    return out;
  } catch(const Failed& e){return e.error;}
  catch(const std::bad_alloc&){return wire::Error{wire::ErrorCode::Limit,"metadata","Metadata allocation failed."};}
}
}  // namespace mudmaker::control
