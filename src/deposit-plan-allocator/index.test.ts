import { beforeEach, describe, expect, test } from '@jest/globals';
import { AllocationInput, DepositPlanType } from '../types';
import { DepositAllocator } from './index';

describe('DepositAllocator', () => {
  let allocator: DepositAllocator;

  beforeEach(() => {
    allocator = new DepositAllocator();
  });

  describe('Default Example', () => {
    test('should handle the exact example from requirements', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [
              { portfolioName: 'High Risk', amount: 10000 },
              { portfolioName: 'Retirement', amount: 500 }
            ]
          },
          {
            type: DepositPlanType.MONTHLY,
            allocations: [
              { portfolioName: 'High Risk', amount: 0 },
              { portfolioName: 'Retirement', amount: 100 }
            ]
          }
        ],
        deposits: [
          { amount: 10500, referenceCode: 'DEP001' },
          { amount: 100, referenceCode: 'DEP002' }
        ]
      };

      const result = allocator.allocate(input);

      expect(result['High Risk']).toBe(10000);
      expect(result['Retirement']).toBe(600);
    });
  });

  describe('One-Time Plan Only', () => {
    test('should allocate exact amount when deposit matches plan', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [
              { portfolioName: 'Conservative', amount: 3000 },
              { portfolioName: 'Aggressive', amount: 2000 }
            ]
          }
        ],
        deposits: [{ amount: 5000, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(3000);
      expect(result['Aggressive']).toBe(2000);
    });

    test('should handle partial allocation when insufficient deposits', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [
              { portfolioName: 'Conservative', amount: 3000 },
              { portfolioName: 'Aggressive', amount: 2000 }
            ]
          }
        ],
        deposits: [{ amount: 2500, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(1500);
      expect(result['Aggressive']).toBe(1000);
    });

    test('should handle excess deposits with proportional allocation', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [
              { portfolioName: 'Conservative', amount: 4000 },
              { portfolioName: 'Aggressive', amount: 1000 }
            ]
          }
        ],
        deposits: [{ amount: 7500, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(6000);
      expect(result['Aggressive']).toBe(1500);
    });
  });

  describe('Monthly Plan Only', () => {
    test('should handle single monthly cycle', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.MONTHLY,
            allocations: [
              { portfolioName: 'Conservative', amount: 600 },
              { portfolioName: 'Aggressive', amount: 400 }
            ]
          }
        ],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(600);
      expect(result['Aggressive']).toBe(400);
    });

    test('should handle multiple monthly cycles', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.MONTHLY,
            allocations: [
              { portfolioName: 'Conservative', amount: 300 },
              { portfolioName: 'Aggressive', amount: 200 }
            ]
          }
        ],
        deposits: [{ amount: 1750, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(1050);
      expect(result['Aggressive']).toBe(700);
    });

    test('should handle monthly cycles with remainder', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.MONTHLY,
            allocations: [
              { portfolioName: 'Conservative', amount: 500 },
              { portfolioName: 'Balanced', amount: 500 },
              { portfolioName: 'Aggressive', amount: 500 }
            ]
          }
        ],
        deposits: [{ amount: 1650, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Conservative']).toBe(550);
      expect(result['Balanced']).toBe(550);
      expect(result['Aggressive']).toBe(550);
    });
  });

  describe('Both Plans Combined', () => {
    test('should prioritize one-time plan then monthly cycles', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Aggressive', amount: 5000 }]
          },
          {
            type: DepositPlanType.MONTHLY,
            allocations: [{ portfolioName: 'Conservative', amount: 1000 }]
          }
        ],
        deposits: [{ amount: 8000, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      expect(result['Aggressive']).toBe(5000);
      expect(result['Conservative']).toBe(3000); // 3 monthly cycles
    });

    test('should handle complex multi-portfolio scenario', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [
              { portfolioName: 'Aggressive', amount: 2000 },
              { portfolioName: 'Conservative', amount: 1000 }
            ]
          },
          {
            type: DepositPlanType.MONTHLY,
            allocations: [
              { portfolioName: 'Conservative', amount: 300 },
              { portfolioName: 'Bonds', amount: 200 }
            ]
          }
        ],
        deposits: [{ amount: 4750, referenceCode: 'DEP001' }]
      };

      const result = allocator.allocate(input);

      // One-time: Aggressive 2000, Conservative 1000 (total 3000)
      // Remaining: 1750
      // Monthly cycles: Math.floor(1750/500) = 3 cycles = 1500
      // Remaining after cycles: 250
      // Partial cycle: Conservative gets 150, Bonds gets 100

      expect(result['Aggressive']).toBe(2000);
      expect(result['Conservative']).toBe(2050);
      expect(result['Bonds']).toBe(700);
    });
  });

  describe('Validation Tests', () => {
    test('should throw error when no plans provided', () => {
      const input: AllocationInput = {
        plans: [],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'At least one deposit plan is required'
      );
    });

    test('should throw error when more than 2 plans provided', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio A', amount: 1000 }]
          },
          {
            type: DepositPlanType.MONTHLY,
            allocations: [{ portfolioName: 'Portfolio B', amount: 500 }]
          },
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio C', amount: 200 }]
          }
        ],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'Maximum 2 deposit plans allowed'
      );
    });

    test('should throw error when no deposits provided', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio A', amount: 1000 }]
          }
        ],
        deposits: []
      };

      expect(() => allocator.allocate(input)).toThrow(
        'At least one deposit is required'
      );
    });

    test('should throw error for duplicate plan types', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio A', amount: 1000 }]
          },
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio B', amount: 500 }]
          }
        ],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'Duplicate plan types not allowed'
      );
    });

    test('should throw error for negative allocation amounts', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio A', amount: -1000 }]
          }
        ],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'Allocation amounts cannot be negative'
      );
    });

    test('should throw error for empty portfolio names', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: '', amount: 1000 }]
          }
        ],
        deposits: [{ amount: 1000, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'Portfolio name cannot be empty'
      );
    });

    test('should throw error for non-positive deposit amounts', () => {
      const input: AllocationInput = {
        plans: [
          {
            type: DepositPlanType.ONE_TIME,
            allocations: [{ portfolioName: 'Portfolio A', amount: 1000 }]
          }
        ],
        deposits: [{ amount: 0, referenceCode: 'DEP001' }]
      };

      expect(() => allocator.allocate(input)).toThrow(
        'Deposit amounts must be positive'
      );
    });
  });
});
