export enum DepositPlanType {
  ONE_TIME = 'ONE_TIME',
  MONTHLY = 'MONTHLY'
}

export interface PortfolioAllocation {
  portfolioName: string;
  amount: number;
}

export interface DepositPlan {
  type: DepositPlanType;
  allocations: PortfolioAllocation[];
}

export interface Deposit {
  amount: number;
  referenceCode: string;
}

export interface AllocationResult {
  [portfolioName: string]: number;
}

export interface AllocationInput {
  plans: DepositPlan[];
  deposits: Deposit[];
}
