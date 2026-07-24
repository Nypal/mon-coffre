#!/usr/bin/env node
const { join } = require("node:path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

global.window = {};
global.document = {};
const localStore = {};
global.localStorage = {
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(localStore, key) ? localStore[key] : null;
  },
  setItem(key, value) {
    localStore[key] = String(value);
  },
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
global.window.innerWidth = 390;
assert(app.mode === "mobile", "narrow phone viewports must force mobile layout");
let mobileVals = app.renderVals();
assert(mobileVals.isMobile === true && mobileVals.isDesktop === false, "mobile render values must hide desktop shell");
global.window.innerWidth = 1024;
assert(app.mode === "desktop", "wide viewports must keep desktop layout");
let desktopVals = app.renderVals();
assert(desktopVals.isDesktop === true && desktopVals.isMobile === false, "desktop render values must keep desktop shell");
delete global.window.innerWidth;
assert(
  app._loginViewportHeight.toString().includes("visualViewport"),
  "mobile login centering must use the visible viewport height"
);
assert(
  app._fitLoginScreen.toString().includes("justifyContent"),
  "mobile login centering must control the vertical alignment"
);
assert(
  app._clearLoginFit.toString().includes("data-mc-login-fit"),
  "mobile login centering must be reversible"
);

const money = app._moneyTests();
assert(money.passed === 33 && money.failed === 0, "money tests must pass 33/33");

const quickAdd = new Component();
quickAdd.props = { mode: "desktop" };
let chooserOpened = false;
let openedForm = "";
quickAdd._openTransactionChooser = () => {
  chooserOpened = true;
};
quickAdd.openForm = (kind) => {
  openedForm = kind;
};
quickAdd.state.page = "dashboard";
quickAdd.openAdd();
assert(chooserOpened === true, "dashboard quick add must offer both income and expense");
quickAdd.state.page = "income";
quickAdd.openAdd();
assert(openedForm === "income", "income quick add must open the income form directly");
quickAdd.state.page = "expenses";
quickAdd.state.addOpen = false;
quickAdd.openAdd();
assert(quickAdd.state.addOpen === true, "expenses quick add must open the expense form directly");
quickAdd.state.currency = "USD";
quickAdd.state.accounts = [
  { name: "Checking", currency: "USD" },
  { name: "Savings", currency: "USD" },
  { name: "Euro account", currency: "EUR" },
];
const incomeAccounts = quickAdd._accOpts().map((option) => option.value);
assert(
  incomeAccounts.includes("Checking") && incomeAccounts.includes("Savings"),
  "income form must offer every account in the active currency"
);
assert(!incomeAccounts.includes("Euro account"), "income form must not mix account currencies");
assert(
  Component.prototype.openForm.toString().includes("Compte qui reçoit l'argent"),
  "income account selector must use plain language"
);
assert(
  Component.prototype._openTransactionChooser.toString().includes("Ajouter un revenu") &&
    Component.prototype._openTransactionChooser.toString().includes("Ajouter une dépense"),
  "transaction chooser must expose both income and expense actions"
);

const calendar = new Component();
calendar.props = { mode: "desktop" };
assert(
  calendar._localIsoDate(new Date(2027, 0, 5, 23, 30)) === "2027-01-05",
  "calendar dates must use the user's local day instead of UTC"
);
assert(calendar._periodFromIso("2026-02-29") === null, "invalid calendar dates must be rejected");
assert(calendar._periodFromIso("2028-02-29") === "2028-02", "valid leap days must be accepted");
assert(calendar._shiftPeriod("2026-12", 1) === "2027-01", "period navigation must cross calendar years");
assert(
  JSON.stringify(calendar._rollingPeriods(3, new Date(2027, 0, 15))) ===
    JSON.stringify(["2026-11", "2026-12", "2027-01"]),
  "rolling calendar periods must cross New Year correctly"
);
assert(
  calendar._recordInPeriod({ date_iso: "2025-07-02" }, "2026-07") === false,
  "records from the same month in another year must stay separate"
);
assert(
  calendar._recordInPeriod({ date_iso: "2026-07-02" }, "2026-07") === true,
  "records must match their exact calendar period"
);
assert(
  calendar._scheduleCalendarRefresh.toString().includes("setTimeout"),
  "the visible calendar must refresh after local midnight"
);

calendar._cloudUser = { id: "00000000-0000-4000-8000-000000000009" };
const datedSnapshot = {
  v: 2,
  currency: "USD",
  accounts: [],
  incomes: [{ id: "income-date", amount_minor: 100, currency: "USD", date_iso: "2025-07-02" }],
  expenses: [{ id: "expense-date", amount_minor: 50, currency: "USD", date_iso: "2024-12-31" }],
  savings: [],
  pots: [],
  debts: [{ id: "debt-date", total_amount_minor: 1000, currency: "USD", start_date_iso: "2023-03-04", due_iso: "2027-01-15" }],
  loans: [{ id: "loan-date", amount_lent_minor: 1000, currency: "USD", loan_date_iso: "2022-09-08", due_iso: "2026-08-10" }],
  savingsContributions: [],
  purchaseContributions: [],
  debtPayments: [],
  loanRepayments: [],
};
const datedRows = calendar._cloudRows(datedSnapshot);
assert(datedRows.income[0].income_date === "2025-07-02", "cloud income dates must not be rewritten");
assert(datedRows.expenses[0].expense_date === "2024-12-31", "cloud expense dates must not be rewritten");
assert(datedRows.debts[0].start_date === "2023-03-04", "cloud debt start dates must be preserved");
assert(datedRows.debts[0].next_payment_date === "2027-01-15", "cloud debt due dates must be preserved");
assert(datedRows.loans_given[0].loan_date === "2022-09-08", "cloud loan dates must be preserved");
assert(
  datedRows.loans_given[0].expected_repayment_date === "2026-08-10",
  "cloud loan repayment dates must be preserved"
);
assert(
  calendar._cloudLoad.toString().includes("date_iso:i.income_date") &&
    calendar._cloudLoad.toString().includes("date_iso:e.expense_date"),
  "cloud loading must retain ISO transaction dates"
);
const livePeriod = calendar._currentPeriod();
const sameMonthLastYear = calendar._shiftPeriod(livePeriod, -12);
calendar.state.currency = "USD";
calendar.state.incomes = [
  { amount_minor: 100, currency: "USD", period: livePeriod },
  { amount_minor: 900, currency: "USD", period: sameMonthLastYear },
];
calendar.state.expenses = [
  { amount_minor: 40, currency: "USD", period: livePeriod, cat: "Divers" },
  { amount_minor: 500, currency: "USD", period: sameMonthLastYear, cat: "Divers" },
];
const calendarVals = calendar.renderVals();
assert(
  calendarVals.resumeInc === calendar.mFmt(100, "USD"),
  "dashboard income must include only the current calendar month and year"
);
assert(
  calendarVals.resumeExp === calendar.mFmt(40, "USD"),
  "dashboard expenses must include only the current calendar month and year"
);

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
let debtDecision = app._debtDecisionPlan();
assert(debtDecision.strategy === "snowball", "plain debt plan must recommend snowball by default");
assert(debtDecision.targetName === "Small debt", "snowball decision must target the smallest balance");
assert(debtDecision.action.includes("surplus"), "debt decision must explain where the surplus goes");

app.state.debts = [
  {
    id: "low-small",
    name: "Small low interest",
    total_amount_minor: 25000,
    paid_amount_minor: 0,
    minimum_minor: 2500,
    apr_bps: 800,
    currency: "USD",
  },
  {
    id: "high-card",
    name: "High interest card",
    total_amount_minor: 60000,
    paid_amount_minor: 0,
    minimum_minor: 3000,
    apr_bps: 2499,
    currency: "USD",
  },
];
app.state.financialPlan = app._mergePlan({
  onboarding: { completed: true },
  snowball: { monthly_budget_minor: 10000 },
});
debtDecision = app._debtDecisionPlan();
assert(debtDecision.strategy === "avalanche", "high interest debt must trigger the cost-first strategy");
assert(debtDecision.targetName === "High interest card", "avalanche decision must target the highest APR debt");
assert(debtDecision.debtFreeStr !== "budget à définir", "debt decision must project a debt-free date when budget exists");

app.state.debts = [
  {
    id: "late-card",
    name: "Late card",
    total_amount_minor: 40000,
    paid_amount_minor: 0,
    minimum_minor: 2000,
    apr_bps: 900,
    currency: "USD",
    status: "En retard",
  },
  {
    id: "expensive-card",
    name: "Expensive but current",
    total_amount_minor: 30000,
    paid_amount_minor: 0,
    minimum_minor: 2000,
    apr_bps: 2999,
    currency: "USD",
    status: "À jour",
  },
];
debtDecision = app._debtDecisionPlan();
assert(debtDecision.strategy === "urgent", "overdue debt must take priority over APR optimization");
assert(debtDecision.targetName === "Late card", "urgent decision must target the overdue debt first");
assert(app._debtPaidMinor(50000, 90000) === 50000, "debt paid amount must be capped at total");
assert(app._debtPaidMinor(50000, -2000) === 0, "debt paid amount must not go below zero");
assert(app.dDebt({ total_amount_minor: 50000, paid_amount_minor: 90000, currency: "USD" }).remainStr === app.mFmt(0, "USD"), "debt card must display capped remaining balance");

const planWithDebtMeta = app._planWithDebtMeta(app._mergePlan({ onboarding: { completed: true } }), {
  name: "New card",
  total_amount_minor: 50000,
  minimum_minor: 2500,
  apr_bps: 1999,
  due: "15 août 2026",
}, "USD");
assert(planWithDebtMeta.structured.debts[0].minimum === "25", "new debt minimum must be kept in financial plan metadata");
assert(planWithDebtMeta.structured.debts[0].apr === "19,99", "new debt APR must be kept in financial plan metadata");
assert(
  app._wireDebtDecisionUi.toString().includes("mc-debt-decision-inline"),
  "debts page must expose the decision aid inline"
);
assert(
  !app._wireDebtDecisionUi.toString().includes("Rien d'alarmant"),
  "debts page decision aid insertion must not depend on fragile helper copy"
);
assert(
  app._openPlanPanel.toString().includes("Plan d’attaque dettes"),
  "financial plan panel must show the debt attack plan"
);
assert(
  app.openForm.toString().includes('{key:"paid",label:"Déjà payé",type:"amount"'),
  "debt paid field must accept money formatting"
);

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

const evaluation = new Component();
evaluation.props = { mode: "desktop" };
evaluation.state.currency = "USD";
evaluation.state.page = "dashboard";
const safeMeta = evaluation._evalSafeMeta({
  source: "nav",
  amount: "5300",
  email: "private@example.com",
  file_path: "user/receipt.png",
  has_proof: true,
});
assert(safeMeta.source === "nav", "product evaluation metadata must keep safe routing context");
assert(safeMeta.has_proof === true, "product evaluation metadata must keep safe boolean context");
assert(!Object.prototype.hasOwnProperty.call(safeMeta, "amount"), "product evaluation metadata must drop amounts");
assert(!Object.prototype.hasOwnProperty.call(safeMeta, "email"), "product evaluation metadata must drop emails");
assert(!Object.prototype.hasOwnProperty.call(safeMeta, "file_path"), "product evaluation metadata must drop file paths");
evaluation._trackFeature("debts", "feature_viewed", { source: "nav" });
evaluation._trackFeature("debts", "feature_started", { kind: "debt" });
evaluation._trackFeature("debts", "feature_failed", { reason: "validation" });
evaluation._trackFeature("financial_plan", "feature_viewed", { source: "debts" });
evaluation._trackFeature("expenses", "feature_completed", { has_account: true, has_proof: false });
const productEval = evaluation._productEvaluation();
assert(productEval.eventCount >= 5, "product evaluation must count local usage signals");
assert(
  productEval.features.some((feature) => feature.id === "debts" && feature.fails === 1),
  "product evaluation must aggregate failures by feature"
);
assert(
  productEval.recommendations.some((rec) => rec.priority === "Haute" && rec.title.includes("Dettes")),
  "product evaluation must recommend fixing failed high-value flows"
);
assert(
  evaluation._productEvaluationHtml().includes("Évaluation automatique du projet"),
  "financial plan panel must expose the product evaluation report"
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
        "debt decision aid",
        "sequential funding",
        "planned purchases",
        "real estate projection",
        "structured onboarding rows",
        "lightweight onboarding start",
        "neutral onboarding label",
        "calendar-synchronized ISO dates",
        "balanced income and expense quick add",
        "dashboard empty-state guidance",
        "privacy-preserving product evaluation",
      ],
    },
    null,
    2
  )
);
