## Setup

```bash
# Clone or download the project
cd Kula-StashAway-Assessment

# Install dependencies
npm install

# run test
npm test

```

## Design Decisions & Assumptions

### Allocation Flow

1. **One-Time Plan Fulfillment**: First priority - allocate to one-time plan targets
2. **Monthly Plan Cycles**: Apply monthly plan repeatedly until insufficient funds
3. **Remainder Distribution**: Distribute any leftover funds

### 1. **One-Time Plan Priority Over Monthly Plans**

**Decision**: One-time plans are fulfilled completely before any monthly plan cycles begin.

**Key Assumptions & Rationale**:

#### **Investment Intent Hierarchy**

- **One-time plans represent immediate, specific investment goals** (e.g., "I want to put $10,000 into my retirement fund now")
- **Monthly plans represent ongoing, flexible investment strategies** (e.g., "I want to invest $500 monthly going forward")
- **Immediate goals take precedence over recurring patterns** in investor psychology

#### **Business Logic Reasoning**

```typescript
// Example: $15,000 deposit with both plans
const plans = [
  { type: ONE_TIME, allocations: [{ portfolio: 'Retirement', amount: 10000 }] },
  { type: MONTHLY, allocations: [{ portfolio: 'Growth', amount: 1000 }] }
];

// Our approach: One-time first, then monthly cycles
// Result: Retirement: $10,000, Growth: $5,000 (5 monthly cycles)
```

#### **Monthly Plan as "Recurring Strategy"**

- Monthly plans represent **repeatable investment patterns**, not single allocations
- The cycle-based approach simulates **"If I invested monthly, how would I allocate?"**
- This matches real-world investor behavior where monthly contributions are ongoing

### 2. **Cycle-Based Monthly Allocation instead of Proportional Approach**

```typescript
// Proportional would treat both plans equally:
// Total planned: $10,000 (one-time) + $1,000 (monthly) = $11,000
// Available: $15,000
// Proportional result:
//   - One-time gets: $10,000 * (15,000/11,000) = $13,636
//   - Monthly gets: $1,000 * (15,000/11,000) = $1,364

// Issues:
// 1. One-time plan gets MORE than requested (unintended)
```

**Decision**: Monthly plans are applied in complete cycles until insufficient funds remain.

#### 🔄 **Cycle Logic**

```typescript
// Monthly plan: $300 to Portfolio A, $200 to Portfolio B (total: $500/cycle)
// Available after one-time: $2,750

// Approach:
// - Complete cycles: Math.floor(2750 / 500) = 5 cycles
// - Allocated: 5 * $500 = $2,500
// - Remaining: $250 (distributed proportionally within monthly plan)

// Result: Portfolio A gets $1,625, Portfolio B gets $1,125
```

### 3. **Remainder Distribution**

**Decision**: Any leftover funds are distributed proportionally based on existing allocation weights.

#### **Simple Logic**

After one-time plans and monthly cycles, if there's still money left:

```typescript
// Example: After allocations, you have:
result = {
  Retirement: 6000, // 60% of total allocated
  Growth: 4000 // 40% of total allocated
};
// Remaining: $500

// Proportional distribution:
// Retirement gets: $500 × (6000/10000) = $300
// Growth gets: $500 × (4000/10000) = $200
```

- **Maintains existing ratios** - If Retirement had 60% before, it stays at 60%
- **No complex rules and predictable** - Just follow the weights that already exist and investors can easily understand what happens to extra money
