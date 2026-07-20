#!/usr/bin/env node
const { join } = require("node:path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

global.window = {};
global.document = {};
global.localStorage = {
  getItem() {
    return null;
  },
  setItem() {},
};
global.indexedDB = {
  open() {
    return {};
  },
};
global.crypto = {
  randomUUID() {
    return "00000000-0000-4000-8000-000000000001";
  },
};
global.DCLogic = class {
  constructor() {
    this.props = { mode: "desktop" };
    this.state = {};
  }
  setState(patch, cb) {
    const next =
      typeof patch === "function" ? patch(this.state, this.props) : patch;
    this.state = { ...this.state, ...(next || {}) };
    if (cb) cb();
  }
};

const { Component } = require(join(__dirname, "..", "frontend", "mc_logic.js"));

const app = new Component();
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

const onboarding = new Component();
onboarding.props = { mode: "desktop" };
onboarding.showToast = () => {};
onboarding._persist = () => {};
onboarding.state.currency = "USD";
onboarding.state.financialPlan = onboarding._mergePlan({
  onboarding: { completed: false },
  profile: { display_name: "Paul", main_currency: "USD" },
  structured: {
    accounts: [{ name: "BofA", balance: "300", role: "Coussin de sécurité" }],
    income: [
      {
        source: "InvenTech",
        amount: "3200",
        frequency: "Bi-hebdomadaire",
        payday: "Vendredi",
        income_type: "Fixe",
      },
    ],
    fixedExpenses: [{ name: "Loyer", amount: "792,35", day: "6", category: "Logement" }],
    debts: [{ name: "CC1", balance: "500", minimum: "25", apr: "24,9", due: "12" }],
    goals: [{ name: "Apport immobilier", target: "15000", date: "2027-06-01", priority: "Haute" }],
    plannedPurchases: [
      {
        name: "MacBook",
        price: "900",
        schedule: "75/semaine",
        priority: "Haute",
        image_url: "javascript:alert(1)",
      },
    ],
  },
});
onboarding._completeOnboarding();
assert(onboarding.state.accounts.length === 1, "structured onboarding must create account rows");
assert(onboarding.state.accounts[0].balance_minor === 30000, "structured account balance must parse");
assert(
  onboarding.state.accounts[0].role.indexOf("Coussin") === 0,
  "structured account role must come from the closed role list"
);
assert(onboarding.state.incomes[0].amount_minor === 320000, "structured income amount must parse");
assert(onboarding.state.incomes[0].freq.indexOf("Bi") === 0, "structured income frequency must be preserved");
assert(onboarding.state.expenses[0].amount_minor === 79235, "structured fixed expense amount must parse");
assert(onboarding.state.expenses[0].cat === "Logement", "structured fixed expense category must be preserved");
assert(onboarding.state.debts[0].minimum_minor === 2500, "structured debt minimum must parse");
assert(onboarding.state.debts[0].apr_bps === 2490, "structured debt APR must parse");
assert(onboarding.state.savings[0].target_amount_minor === 1500000, "structured savings goal must parse");
assert(onboarding.state.pots[0].weekly_minor === 7500, "structured planned purchase weekly amount must parse");
assert(onboarding.state.pots[0].image_url === "", "unsafe planned purchase image URLs must be stripped");
assert(
  onboarding._debtMetaFromPlan(onboarding.state.financialPlan).cc1.minimum_minor === 2500,
  "debt metadata must read structured onboarding rows"
);
assert(
  onboarding._purchaseMetaFromPlan(onboarding.state.financialPlan).macbook.weekly_minor === 7500,
  "planned purchase metadata must read structured onboarding rows"
);
assert(
  onboarding._parseObRows("accounts", "BofA | 300 | coussin")[0].role.indexOf("Coussin") === 0,
  "legacy account rows must normalize to a closed role"
);
assert(
  onboarding._parseObRows("fixedExpenses", "TapTap Send | 200 | 15 | famille")[0].category === "Famille",
  "legacy fixed expense rows must normalize to a closed category"
);
assert(onboarding._obDefaultRow("fixedExpenses").day === "1", "fixed expenses must default to a fixed day");
const fixedDayOptions = onboarding._obFields("fixedExpenses").find((field) => field[0] === "day")[3];
assert(fixedDayOptions[0] === "1", "fixed expense day selector must start with day 1");
assert(fixedDayOptions.includes("Variable"), "fixed expense day selector must keep Variable as an explicit option");
assert(
  onboarding._parseObRows("fixedExpenses", "Loyer | 792,35")[0].day === "1",
  "legacy fixed expenses without a day must default to day 1"
);
assert(onboarding._renderOnboarding.toString().includes(">Onboarding<"), "onboarding label must be neutral");
assert(
  !onboarding._renderOnboarding.toString().includes("Onboarding obligatoire"),
  "onboarding label must not contradict the skip action"
);
const draftRowsPlan = onboarding._mergePlan({
  structured: {
    fixedExpenses: [
      { name: "Loyer", amount: "792,35", day: "1", category: "Logement" },
      onboarding._obDefaultRow("fixedExpenses"),
    ],
  },
});
assert(
  onboarding._obRows("fixedExpenses", draftRowsPlan, true).length === 2,
  "repeatable onboarding sections must keep blank draft rows visible"
);
assert(
  onboarding._obRows("fixedExpenses", draftRowsPlan).length === 1,
  "blank draft rows must be ignored when onboarding data is saved"
);
const debtFields = onboarding._obFields("debts").map((field) => field[1]);
assert(debtFields.includes("À qui / pour quoi ?"), "debt onboarding must use plain-language creditor labels");
assert(debtFields.includes("Montant restant"), "debt onboarding must explain balance as remaining amount");
assert(debtFields.includes("Minimum à payer"), "debt onboarding must explain monthly minimum plainly");
assert(debtFields.includes("Intérêt si connu"), "debt onboarding must make interest optional and understandable");
assert(
  onboarding._renderOnboarding.toString().includes("Combien peux-tu payer par mois ?"),
  "debt budget prompt must be plain-language"
);
assert(
  !onboarding._renderOnboarding.toString().includes("Budget mensuel total dettes"),
  "debt onboarding must avoid finance-first budget jargon"
);
assert(
  onboarding._renderOnboarding.toString().includes("Argent à garder pour les urgences"),
  "goals onboarding must start with a plain emergency-fund prompt"
);
assert(
  onboarding._renderOnboarding.toString().includes("Ajouter une cagnotte ou un objectif"),
  "goals onboarding must move optional goals into a clear section"
);
assert(
  onboarding._renderOnboarding.toString().includes("Préparer un achat cash"),
  "planned purchases must be framed as an optional cash purchase section"
);
assert(
  onboarding._renderOnboarding.toString().includes("_obDetailsHtml"),
  "optional goals onboarding sections must be collapsible"
);
assert(
  !onboarding._renderOnboarding.toString().includes("Mode de financement"),
  "goals onboarding must avoid abstract funding-mode jargon"
);

const quickStart = new Component();
quickStart.props = { mode: "desktop" };
quickStart.showToast = () => {};
quickStart._persist = () => {};
quickStart.state.currency = "USD";
quickStart.state.financialPlan = quickStart._mergePlan({
  onboarding: { completed: false },
  profile: { main_currency: "USD", pay_frequency: "Bi-hebdomadaire" },
  lifestyle: { new_income_minor: 530000, baseline_expense_minor: 210000 },
  structured: {
    income: [
      {
        source: "",
        amount: "",
        frequency: "Mensuel",
        payday: "Variable",
        income_type: "Fixe",
      },
    ],
  },
});
assert(
  quickStart._obRows("income", quickStart.state.financialPlan).length === 0,
  "blank structured onboarding rows must be ignored even when selects have defaults"
);
quickStart._completeOnboarding();
assert(quickStart.state.incomes.length === 1, "quick-start onboarding must create one useful income row");
assert(quickStart.state.incomes[0].source === "Revenu principal", "quick-start income must use a generic label");
assert(quickStart.state.incomes[0].amount_minor === 530000, "quick-start income must use current monthly income");
assert(quickStart.state.incomes[0].freq === "Mensuel", "quick-start income must stay monthly to avoid double-counting");
assert(
  quickStart.state.incomes[0].note.indexOf("Bi") >= 0,
  "quick-start income note must preserve the user's payday rhythm"
);

const emptyDashboard = new Component();
emptyDashboard.props = { mode: "desktop" };
emptyDashboard.state.currency = "USD";
emptyDashboard.state.accounts = [];
emptyDashboard.state.incomes = [];
emptyDashboard.state.expenses = [];
emptyDashboard.state.savings = [];
emptyDashboard.state.pots = [];
emptyDashboard.state.debts = [];
emptyDashboard.state.loans = [];
const emptyVals = emptyDashboard.renderVals();
assert(emptyVals.summaryCards[0].sub === "Ajoute ton premier compte", "empty dashboard must prompt for first account");
assert(emptyVals.summaryCards[1].sub === "Ajoute ton premier revenu", "empty dashboard must prompt for first income");
assert(emptyVals.summaryCards[3].sub === "Crée ta première cagnotte", "empty dashboard must prompt for first saving goal");
assert(emptyVals.summaryCards[4].sub === "Renseigne une dette", "empty dashboard must prompt for debts");
assert(
  emptyVals.coachLine.indexOf("premier revenu") >= 0,
  "empty dashboard coach line must guide the next useful action"
);

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
        "structured onboarding rows",
        "lightweight onboarding start",
        "neutral onboarding label",
        "dashboard empty-state guidance",
      ],
    },
    null,
    2
  )
);
