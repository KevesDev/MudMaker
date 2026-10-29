#pragma once
#include <array>

#include "ecs/registry.h"

namespace ecs {

struct Position { std::uint32_t x, y, z; };
struct Velocity { std::uint32_t x, y, z; };
struct Health { std::uint32_t value; };
struct Ticket { std::uint64_t a, b, c; };

// The shared component set. Every entry, including the creator ticket whose layout comes from
// a runtime field list, goes through the same registerComponent path.
struct Standard {
  ComponentRegistry reg;
  ComponentId position, velocity, health, frozen, marked, ticket;

  Standard() {
    position = reg.registerComponent("mud.position", sizeof(Position), alignof(Position));
    velocity = reg.registerComponent("mud.velocity", sizeof(Velocity), alignof(Velocity));
    health = reg.registerComponent("mud.health", sizeof(Health), alignof(Health));
    frozen = reg.registerComponent("mud.tag.frozen", 0, 1);
    marked = reg.registerComponent("mud.tag.marked", 0, 1);
    const std::array<FieldSpec, 3> fields{{{8, 8}, {8, 8}, {8, 8}}};
    ticket = reg.registerComponent(layoutFromFields("creator.ticket", fields));
    if (reg.desc(ticket).size != sizeof(Ticket) || reg.desc(ticket).align != alignof(Ticket)) {
      throw std::logic_error("ticket overlay does not match its runtime layout");
    }
    reg.freeze();
  }
};

}  // namespace ecs
