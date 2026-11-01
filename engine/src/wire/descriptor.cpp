#include "mudmaker/wire/codec.h"
#include <google/protobuf/descriptor.pb.h>
#include <limits>

namespace mudmaker::wire {
namespace {
using google::protobuf::DescriptorProto;
using google::protobuf::EnumDescriptorProto;
using google::protobuf::FileDescriptorSet;
struct Changed { std::string path; };
template <typename Repeated> const typename Repeated::value_type& named(const Repeated& items, const std::string& name, const std::string& path) {
  for (const auto& item : items) if (item.name() == name) return item;
  throw Changed{path + "." + name};
}
void enumeration(const EnumDescriptorProto& before, const EnumDescriptorProto& after, const std::string& path) {
  for (const auto& value : before.value()) {
    const auto& current = named(after.value(), value.name(), path);
    if (value.number() != current.number()) throw Changed{path + "." + value.name()};
  }
}
void message(const DescriptorProto& before, const DescriptorProto& after, const std::string& path) {
  for (const auto& oneof : before.oneof_decl()) named(after.oneof_decl(), oneof.name(), path);
  for (const auto& field : before.field()) {
    const auto& current = named(after.field(), field.name(), path);
    if (field.number() != current.number() || field.type() != current.type() || field.type_name() != current.type_name() ||
        field.label() != current.label() || field.has_oneof_index() != current.has_oneof_index() || field.proto3_optional() != current.proto3_optional()) throw Changed{path + "." + field.name()};
    if (field.has_oneof_index() && before.oneof_decl(field.oneof_index()).name() != after.oneof_decl(current.oneof_index()).name()) throw Changed{path + "." + field.name()};
  }
  for (const auto& child : before.nested_type()) message(child, named(after.nested_type(), child.name(), path), path + "." + child.name());
  for (const auto& child : before.enum_type()) enumeration(child, named(after.enum_type(), child.name(), path), path + "." + child.name());
}
}  // namespace
Result<std::monostate> compatible_descriptors(std::span<const std::uint8_t> frozen, std::span<const std::uint8_t> current) {
  FileDescriptorSet before, after;
  if (frozen.empty() || current.empty() || frozen.size() > static_cast<std::size_t>(std::numeric_limits<int>::max()) || current.size() > static_cast<std::size_t>(std::numeric_limits<int>::max()) ||
      !before.ParseFromArray(frozen.data(), static_cast<int>(frozen.size())) || !after.ParseFromArray(current.data(), static_cast<int>(current.size()))) return Error{ErrorCode::Descriptor, "descriptor", "Descriptor set is missing/malformed."};
  try {
    for (const auto& file : before.file()) {
      const auto& output = named(after.file(), file.name(), "file");
      if (file.package() != output.package() || file.syntax() != output.syntax()) throw Changed{file.name()};
      for (const auto& type : file.message_type()) message(type, named(output.message_type(), type.name(), file.name()), file.package() + "." + type.name());
      for (const auto& type : file.enum_type()) enumeration(type, named(output.enum_type(), type.name(), file.name()), file.package() + "." + type.name());
    }
    return std::monostate{};
  } catch (const Changed& changed) { return Error{ErrorCode::Descriptor, changed.path, "Existing descriptor package/message/field/enum contract changed or was removed."}; }
}
}  // namespace mudmaker::wire
