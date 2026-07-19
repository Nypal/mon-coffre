#!/usr/bin/env node
const fs = require("fs");
const vm = require("vm");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs
  .readFileSync("frontend/mc_logic.js", "utf8")
  .replace(
    /class Component extends DCLogic/,
    "globalThis.Component = class Component extends DCLogic"
  );

const sandbox = {
  console,
  window: {},
  document: {},
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
  indexedDB: {
    open() {
      return {};
    },
  },
  crypto: {
    randomUUID() {
      return "00000000-0000-4000-8000-000000000001";
    },
  },
  DCLogic: class {
    constructor() {
      this.props = { mode: "desktop" };
      this.state = {};
    }
    setState(patch, cb) {
      const next =
        typeof patch === "function" ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, next || {});
      if (cb) cb();
    }
  },
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const app = new sandbox.Component();
app.props = { mode: "desktop" };

const money = app._moneyTests();
assert(money.passed === 33 && money.failed === 0, "money tests must pass 33/33");

app.MC_CLOUD = { enabled: true };
app._cloudUser = { id: "user-a" };
app.state.financialPlan = null;
assert(app._needsOnboarding() === true, "cloud users must complete onboarding");

app.state.financialPlan = app._mergePlan({ onboarding: { completed: true } });
assert(app._needsOnboarding() === false, "completed onboarding must unlock app");

app.state.currency = "USD";
app.state.financialPlan = app._mergePlan({
  onboarding: { completed: true },
  lifestyle: { new_income_minor: 300000, baseline_expense_minor: 200000 },
});
app.state.incomes = [
  { amount_minor: 100000, currency: "USD", freq: "Mensuel", month: app._thisMonth() },
];
assert(
  app._monthlyIncomeMinor() === 100000,
  "income rows must not be double-counted with onboarding income"
);

app.state.debts = [
  {
    name: "Large debt",
    total_amount_minor: 90000,
    paid_amount_minor: 0,
    minimum_minor: 3000,
    currency: "USD",
  },
  {
    name: "Small debt",
    total_amount_minor: 25000,
    paid_amount_minor: 0,
    minimum_minor: 2500,
    currency: "USD",
  },
];
app.state.financialPlan = app._mergePlan({
  onboarding: { completed: true },
  snowball: { monthly_budget_minor: 10000 },
});
assert(app._snowballPlan()[0].name === "Small debt", "snowball must start with the smallest balance");

app.state.savings = [
  {
    name: "Vacation",
    target_amount_minor: 100000,
    current_amount_minor: 10000,
    priority: "Haute",
    currency: "USD",
  },
  {
    name: "Coussin de sécurité",
    target_amount_minor: 80000,
    current_amount_minor: 10000,
    priority: "Moyenne",
    currency: "USD",
  },
];
app.state.pots = [
  {
    name: "MacBook",
    target_amount_minor: 90000,
    current_amount_minor: 0,
    currency: "USD",
    goal_type: "planned_purchase",
    planned: true,
    weekly_minor: 7500,
  },
];
assert(
  app._sequentialFunding().active.name === "Coussin de sécurité",
  "sequential funding must prioritize the emergency fund"
);
assert(app._plannedPurchaseViews()[0].weekly === 7500, "planned purchase weekly amount must be preserved");
assert(app._plannedPurchaseViews()[0].savedHigh > 0, "planned purchase must show financing savings");

app.state.incomes = [
  { amount_minor: 530000, currency: "USD", freq: "Mensuel", month: app._thisMonth() },
];
app.state.savings = [
  {
    name: "Apport immobilier",
    target_amount_minor: 1500000,
    current_amount_minor: 420000,
    priority: "Haute",
    currency: "USD",
  },
];
app.state.financialPlan = app._mergePlan({
  onboarding: { completed: true },
  realEstate: {
    status: "yes",
    linked_goal_name: "Apport immobilier",
    rate_bps: 700,
    term_months: 360,
  },
});
const realEstate = app._realEstateProjection();
assert(realEstate.maxPayment > 0, "real estate projection must calculate a housing payment");
assert(realEstate.downPayment === 420000, "real estate projection must reuse linked down payment goal");
assert(realEstate.maxPrice > realEstate.downPayment, "real estate projection must estimate buying power");

console.log(
  JSON.stringify(
    {
      ok: true,
      money: { passed: money.passed, failed: money.failed, total: money.total },
      modules: [
        "mandatory onboarding gate",
        "lifestyle income fallback",
        "debt snowball",
        "sequential funding",
        "planned purchases",
        "real estate projection",
      ],
    },
    null,
    2
  )
);
