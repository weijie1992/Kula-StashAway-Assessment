import {
  AllocationInput,
  AllocationResult,
  Deposit,
  DepositPlan,
  DepositPlanType
} from '../types';

export class DepositAllocator {
  private static readonly MINIMUM_AMOUNT = 0.001;

  public allocate(input: AllocationInput): AllocationResult {
    this.validate(input);

    const { plans, deposits } = input;
    const result: AllocationResult = {};

    const oneTimePlan = plans.find((p) => p.type === DepositPlanType.ONE_TIME);
    const monthlyPlan = plans.find((p) => p.type === DepositPlanType.MONTHLY);

    let remainingDeposits = this.getTotalDeposits(deposits);

    // Fulfill one-time plan first
    if (oneTimePlan) {
      const allocated = this.fulfillPlan(
        oneTimePlan,
        remainingDeposits,
        result
      );
      remainingDeposits = remainingDeposits - allocated;
    }

    // Fulfill monthly plan next
    if (monthlyPlan && remainingDeposits > 0) {
      const monthlyTotal = this.getPlanTotal(monthlyPlan);

      if (monthlyTotal > 0) {
        // Check if deposit can cover how many full cycles
        const cycles = Math.floor(remainingDeposits / monthlyTotal);

        for (let i = 0; i < cycles; i++) {
          const allocated = this.fulfillPlan(monthlyPlan, monthlyTotal, result);
          remainingDeposits = remainingDeposits - allocated;
        }

        if (remainingDeposits > DepositAllocator.MINIMUM_AMOUNT) {
          const allocated = this.fulfillPlanPartially(
            monthlyPlan,
            remainingDeposits,
            result
          );
          remainingDeposits -= allocated;
        }
      }
    }
    //Handle cases when no monthly plan or monthly plan was 0
    if (oneTimePlan && remainingDeposits > DepositAllocator.MINIMUM_AMOUNT) {
      const allocated = this.fulfillPlanPartially(
        oneTimePlan,
        remainingDeposits,
        result
      );
      remainingDeposits -= allocated;
    }

    // Final check if there is still remaining, distribute remaining funds based on existing allocation weights
    if (remainingDeposits > DepositAllocator.MINIMUM_AMOUNT) {
      this.distributeFinalRemainder(remainingDeposits, result);
    }

    return this.roundResult(result);
  }

  private validate(input: AllocationInput): void {
    const { plans, deposits } = input;

    if (!plans || plans.length === 0) {
      throw new Error('At least one deposit plan is required');
    }

    if (plans.length > 2) {
      throw new Error('Maximum 2 deposit plans allowed');
    }

    if (!deposits || deposits.length === 0) {
      throw new Error('At least one deposit is required');
    }

    const planTypes = plans.map((p) => p.type);
    if (new Set(planTypes).size !== planTypes.length) {
      throw new Error('Duplicate plan types not allowed');
    }

    plans.forEach((plan) => {
      if (!plan.allocations || plan.allocations.length === 0) {
        throw new Error('Each plan must have at least one allocation');
      }

      plan.allocations.forEach((alloc) => {
        if (alloc.amount < 0) {
          throw new Error('Allocation amounts cannot be negative');
        }
        if (!alloc.portfolioName || alloc.portfolioName.trim() === '') {
          throw new Error('Portfolio name cannot be empty');
        }
      });
    });

    deposits.forEach((deposit) => {
      if (deposit.amount <= 0) {
        throw new Error('Deposit amounts must be positive');
      }
      if (!deposit.referenceCode || deposit.referenceCode.trim() === '') {
        throw new Error('Reference code cannot be empty');
      }
    });
  }

  private fulfillPlan(
    plan: DepositPlan,
    available: number,
    result: AllocationResult
  ): number {
    const planTotal = this.getPlanTotal(plan);
    const toAllocate = Math.min(planTotal, available);

    plan.allocations.forEach((alloc) => {
      const amount = Math.min(
        alloc.amount,
        (alloc.amount / planTotal) * toAllocate
      );
      this.addToResult(result, alloc.portfolioName, amount);
    });

    return toAllocate;
  }

  private fulfillPlanPartially(
    plan: DepositPlan,
    available: number,
    result: AllocationResult
  ): number {
    const planTotal = this.getPlanTotal(plan);

    if (planTotal === 0) {
      return 0;
    }

    const ratio = available / planTotal;
    let allocated = 0;

    plan.allocations.forEach((alloc, index) => {
      let amount: number;

      if (index === plan.allocations.length - 1) {
        amount = available - allocated;
      } else {
        amount = alloc.amount * ratio;
      }

      this.addToResult(result, alloc.portfolioName, amount);
      allocated += amount;
    });

    return allocated;
  }

  private distributeFinalRemainder(
    remainingAmount: number,
    result: AllocationResult
  ): void {
    const totalAllocated = this.getTotalAllocated(result);

    if (totalAllocated > DepositAllocator.MINIMUM_AMOUNT) {
      this.distributeProportionally(remainingAmount, result, totalAllocated);
    }
  }

  private distributeProportionally(
    remainingAmount: number,
    result: AllocationResult,
    totalAllocated: number
  ): void {
    const portfolioNames = Object.keys(result);
    let distributed = 0;

    portfolioNames.forEach((name, index) => {
      const isLastPortfolio = index === portfolioNames.length - 1;

      const amount = isLastPortfolio
        ? remainingAmount - distributed
        : (result[name] / totalAllocated) * remainingAmount;

      this.addToResult(result, name, amount);
      distributed += amount;
    });
  }

  private getTotalAllocated(result: AllocationResult): number {
    let total = 0;
    for (const amount of Object.values(result)) {
      total += amount;
    }
    return total;
  }

  private getPlanTotal(plan: DepositPlan): number {
    let total = 0;
    for (const alloc of plan.allocations) {
      total += alloc.amount;
    }
    return total;
  }

  private getTotalDeposits(deposits: Deposit[]): number {
    let total = 0;
    for (const deposit of deposits) {
      total += deposit.amount;
    }
    return total;
  }

  private addToResult(
    result: AllocationResult,
    portfolioName: string,
    amount: number
  ): void {
    if (!result[portfolioName]) {
      result[portfolioName] = 0;
    }
    result[portfolioName] += amount;
  }

  private roundResult(result: AllocationResult): AllocationResult {
    const rounded: AllocationResult = {};

    Object.keys(result).forEach((key) => {
      rounded[key] = Math.round(result[key] * 100) / 100;
    });

    return rounded;
  }
}

export const allocateDeposits = (input: AllocationInput): AllocationResult => {
  const allocator = new DepositAllocator();
  return allocator.allocate(input);
};
