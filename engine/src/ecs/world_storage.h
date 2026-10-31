#pragma once
#include "mudmaker/ecs/world.h"
#include <algorithm>
#include <limits>
#include <set>
#include <stdexcept>
#include <type_traits>

namespace mudmaker::ecs::detail {
enum class Presence : std::uint8_t { Absent, Null, Present };
struct Cell { Presence presence; SchemaValue value; };
struct Node {
  FieldKind kind;
  bool state;
  std::string name;
  std::vector<std::size_t> children;
};
struct Layout {
  std::vector<Node> nodes;
  std::map<FieldId, std::vector<std::string>> fields;
  std::set<FieldId> list_fields;
};
inline void list_fields(const ValueSchema& type, std::set<FieldId>& ids) {
  for (const auto& field : type.fields) { ids.insert(field.id); list_fields(*field.type, ids); }
  if (type.element) list_fields(*type.element, ids);
}
inline std::size_t compile_node(Layout& layout, const ValueSchema& type, bool optional,
    std::string name, const std::vector<std::string>& path) {
  const auto index = layout.nodes.size();
  layout.nodes.push_back({type.kind, optional || type.nullable, std::move(name), {}});
  if (type.kind == FieldKind::Record) {
    for (const auto& field : type.fields) {
      auto child_path = path; child_path.push_back(field.name);
      layout.fields.emplace(field.id, child_path);
      const auto child = compile_node(layout, *field.type, !field.required, field.name, child_path);
      layout.nodes[index].children.push_back(child);
    }
  } else if (type.kind == FieldKind::List) list_fields(*type.element, layout.list_fields);
  return index;
}
inline Layout compile_layout(const ComponentSchema& schema) {
  Layout result;
  result.nodes.push_back({FieldKind::Record, false, {}, {}});
  for (const auto& field : schema.fields) {
    const std::vector<std::string> path{field.name};
    result.fields.emplace(field.id, path);
    const auto child = compile_node(result, *field.type, !field.required, field.name, path);
    result.nodes[0].children.push_back(child);
  }
  return result;
}
inline void flatten_node(const Layout& layout, std::size_t node, const SchemaValue* value, std::vector<Cell>& cells) {
  const auto presence = !value ? Presence::Absent : std::holds_alternative<std::monostate>(value->data) ? Presence::Null : Presence::Present;
  const auto& definition = layout.nodes[node];
  cells[node] = {presence, definition.kind == FieldKind::Record || !value ? SchemaValue{} : *value};
  const auto record = presence == Presence::Present ? std::get_if<SchemaValue::Record>(&value->data) : nullptr;
  for (auto child : definition.children) {
    const SchemaValue* child_value = nullptr;
    if (record) { const auto found = record->find(layout.nodes[child].name); if (found != record->end()) child_value = &found->second; }
    flatten_node(layout, child, child_value, cells);
  }
}
inline std::vector<Cell> flatten(const Layout& layout, const SchemaValue& value) {
  std::vector<Cell> cells(layout.nodes.size()); flatten_node(layout, 0, &value, cells); return cells;
}
using Payload = std::variant<std::monostate, std::vector<std::uint8_t>, std::vector<std::int64_t>,
    std::vector<double>, std::vector<std::string>, std::vector<EntityId>, std::vector<AssetReference>, std::vector<SchemaValue::List>>;
struct Column {
  Payload payload;
  bool has_state;
  std::vector<Presence> states;
  explicit Column(const Node& node) : has_state(node.state) {
    switch (node.kind) {
      case FieldKind::Boolean: payload = std::vector<std::uint8_t>{}; break;
      case FieldKind::Integer: payload = std::vector<std::int64_t>{}; break;
      case FieldKind::Floating: payload = std::vector<double>{}; break;
      case FieldKind::Text: payload = std::vector<std::string>{}; break;
      case FieldKind::Entity: payload = std::vector<EntityId>{}; break;
      case FieldKind::Asset: payload = std::vector<AssetReference>{}; break;
      case FieldKind::List: payload = std::vector<SchemaValue::List>{}; break;
      case FieldKind::Record: break;
    }
  }
  std::size_t footprint() const {
    return (has_state ? sizeof(Presence) : 0) + std::visit([](const auto& values) -> std::size_t {
      using V = std::decay_t<decltype(values)>;
      if constexpr (std::is_same_v<V, std::monostate>) return 0;
      else return sizeof(typename V::value_type);
    }, payload);
  }
  void reserve(std::size_t count) {
    if (has_state) states.reserve(count);
    std::visit([&](auto& values) { if constexpr (!std::is_same_v<std::decay_t<decltype(values)>, std::monostate>) values.reserve(count); }, payload);
  }
  template <typename T> static T extract(Cell& cell) noexcept {
    if (cell.presence != Presence::Present) return {};
    if constexpr (std::is_same_v<T, std::uint8_t>) return std::get<bool>(cell.value.data) ? 1 : 0;
    else return std::move(std::get<T>(cell.value.data));
  }
  void push(Cell& cell) noexcept {
    if (has_state) states.push_back(cell.presence);
    std::visit([&](auto& values) {
      using V = std::decay_t<decltype(values)>;
      if constexpr (!std::is_same_v<V, std::monostate>) {
        static_assert(std::is_nothrow_move_constructible_v<typename V::value_type>);
        values.push_back(extract<typename V::value_type>(cell));
      }
    }, payload);
  }
  void replace(std::size_t row, Cell& cell) noexcept {
    if (has_state) states[row] = cell.presence;
    std::visit([&](auto& values) {
      using V = std::decay_t<decltype(values)>;
      if constexpr (!std::is_same_v<V, std::monostate>) {
        static_assert(std::is_nothrow_move_assignable_v<typename V::value_type>);
        values[row] = extract<typename V::value_type>(cell);
      }
    }, payload);
  }
  void swap_pop(std::size_t row, Column& last, std::size_t last_row) noexcept {
    if (has_state) { if (this != &last || row != last_row) states[row] = last.states[last_row]; last.states.pop_back(); }
    std::visit([&](auto& values) {
      using V = std::decay_t<decltype(values)>;
      if constexpr (!std::is_same_v<V, std::monostate>) {
        auto& source = std::get<V>(last.payload);
        if (this != &last || row != last_row) values[row] = std::move(source[last_row]);
        source.pop_back();
      }
    }, payload);
  }
  Cell read(std::size_t row) const {
    Cell result{has_state ? states[row] : Presence::Present, {}};
    if (result.presence != Presence::Present) return result;
    std::visit([&](const auto& values) {
      using V = std::decay_t<decltype(values)>;
      if constexpr (!std::is_same_v<V, std::monostate>) {
        if constexpr (std::is_same_v<typename V::value_type, std::uint8_t>) result.value.data = values[row] != 0;
        else result.value.data = values[row];
      }
    }, payload);
    return result;
  }
};
using Columns = std::vector<Column>;
inline Columns make_columns(const Layout& layout) {
  Columns columns; columns.reserve(layout.nodes.size());
  for (const auto& node : layout.nodes) columns.emplace_back(node);
  return columns;
}
inline std::optional<SchemaValue> reconstruct(const Layout& layout, const Columns& columns, std::size_t node, std::size_t row) {
  auto cell = columns[node].read(row);
  if (cell.presence == Presence::Absent) return {};
  if (cell.presence == Presence::Null) return SchemaValue{};
  if (layout.nodes[node].kind == FieldKind::Record) {
    SchemaValue::Record record;
    for (auto child : layout.nodes[node].children) if (auto value = reconstruct(layout, columns, child, row)) record.emplace(layout.nodes[child].name, std::move(*value));
    return SchemaValue{std::move(record)};
  }
  return std::move(cell.value);
}
inline SchemaValue read(const Layout& layout, const Columns& columns, std::size_t row) { return *reconstruct(layout, columns, 0, row); }
inline void push(Columns& columns, std::vector<Cell>& cells) noexcept { for (std::size_t i = 0; i < columns.size(); ++i) columns[i].push(cells[i]); }
inline void replace(Columns& columns, std::size_t row, std::vector<Cell>& cells) noexcept { for (std::size_t i = 0; i < columns.size(); ++i) columns[i].replace(row, cells[i]); }
inline void swap_pop(Columns& columns, std::size_t row, Columns& last, std::size_t last_row) noexcept { for (std::size_t i = 0; i < columns.size(); ++i) columns[i].swap_pop(row, last[i], last_row); }
}  // namespace mudmaker::ecs::detail
