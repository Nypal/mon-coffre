
class Component extends DCLogic {

  /* =================================================================
     MON COFFRE - application logic and backend adapter
     Money model: INTEGER minor units only. No floating point storage.
       USD / EUR -> cents (exp 2)
       XOF / XAF -> whole units (exp 0)
     Each financial row carries its own currency.
     fmt() formats values only; it does not convert currencies.
     The visual template is untouched: renderVals keys are a contract
     with the compiled design bundle and keep their original names.
     ================================================================= */

  /* ---------- Supabase configuration, disabled by default ---------- */
  MC_CLOUD = { enabled:false, url:"https://your-project.supabase.co", anonKey:"sb_publishable_your_public_key" };
  SUPABASE_SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.7/dist/umd/supabase.min.js";
  SUPABASE_SDK_INTEGRITY = "sha384-BmlQlKlDvXvKoxkn5OQuUo/aJQCTXeB+Kls6EccBmG4Kf8AXvp89RtO9MtPxP/r5";

  /* ---------- Storage keys ---------- */
  _KEY    = "moncoffre.local.v2";
  _KEY_V1 = "moncoffre.local.v1";
  _KEY_BK = "moncoffre.local.v1.backup";
  _EVAL_KEY = "moncoffre.product.eval.v1";
  _APP_VERSION = "web-2026-07-20";

  /* ---------- Money core ---------- */
  MONEY = {
    USD:{ exp:2, sym:"$"    },
    EUR:{ exp:2, sym:"€"    },
    XOF:{ exp:0, sym:"FCFA" },
    XAF:{ exp:0, sym:"FCFA" }
  };
  _cur(c){ return this.MONEY[c] ? c : "USD"; }
  _exp(c){ return this.MONEY[this._cur(c)].exp; }
  _sym(c){ return this.MONEY[this._cur(c)].sym; }
  _pow(e){ var p=1; for(var i=0;i<e;i++) p*=10; return p; }

  /* Single money parsing function.
     User input string -> integer minor units. No parseFloat. */
  mParse(input, currency){
    var exp=this._exp(currency);
    var s=String(input==null?"":input).trim().replace(/ /g," ").replace(/\s/g,"").replace(",",".");
    if(s==="") return 0;
    var neg=false;
    if(s.charAt(0)==="-"){ neg=true; s=s.slice(1); }
    if(!/^\d*(\.\d*)?$/.test(s)) return 0;
    var parts=s.split("."), whole=parts[0]||"0", frac=parts[1]||"";
    var keep=frac.slice(0,exp);
    while(keep.length<exp) keep+="0";
    var next=frac.charAt(exp);
    var minor=Number(whole+keep);
    if(!isFinite(minor)) return 0;
    if(next && Number(next)>=5) minor+=1;   // round half up
    return neg ? -minor : minor;
  }

  /* Single money formatting function. No currency conversion. */
  mFmt(minor, currency, signed){
    var c=this._cur(currency), exp=this._exp(c), sym=this._sym(c);
    var n=Math.trunc(Number(minor)||0);
    var abs=Math.abs(n), div=this._pow(exp);
    var whole=Math.trunc(abs/div), frac=abs-whole*div;
    var str=new Intl.NumberFormat("fr-FR").format(whole);
    if(exp>0 && frac!==0){                 // decimals only when useful
      var f=String(frac); while(f.length<exp) f="0"+f;
      str+=","+f;
    }
    var sign = signed ? (n>0?"+":(n<0?"-":"")) : (n<0?"-":"");
    return sign+str+" "+sym;
  }

  /* Historical alias: fmt(minor, signed, currency), active currency by default. */
  fmt(minor, signed, currency){
    return this.mFmt(minor, currency||this.state.currency, signed);
  }
  curSym(){ return this._sym(this.state.currency); }
  /* Row currency, falling back to the active currency. */
  _rc(r){ return this._cur((r && r.currency) || this.state.currency); }
  /* Aggregate only active-currency rows. No conversion. */
  _same(r){ return this._rc(r) === this._cur(this.state.currency); }
  _sum(list, field){
    var self=this, t=0;
    list.forEach(function(r){ if(self._same(r)) t+=Math.trunc(Number(r[field])||0); });
    return t;
  }

  C = { ink:"#17293C", ink2:"#5A6B78", ink3:"#8B98A2", brand:"#1E5081", brandDk:"#17405F", brandBg:"#EAF1F8", green:"#3F9A5A", greenDk:"#34824B", greenBg:"#E7F3EB", gold:"#B98A2E", goldBg:"#F6EED7", danger:"#C15F4C", dangerBg:"#F6E7E2", bg:"#F3F4F1", card:"#FFFFFF", line:"#E7E9E4", line2:"#EFF1EC" };
  ICONS = {
    home:"M4 11.5 12 5l8 6.5M6 10.2V19h4v-5h4v5h4v-8.8",
    wallet:"M4 8.5C4 7 5 6 6.5 6H17c1.1 0 2 .9 2 2M4 8.5V17c0 1.1.9 2 2 2h12c.8 0 1.5-.7 1.5-1.5V11c0-.8-.7-1.5-1.5-1.5H6C4.9 9.5 4 9.6 4 8.5Zm12.5 4.5h.01",
    income:"M12 4v10m0 0 4-4m-4 4-4-4M5 20h14",
    expense:"M12 20V10m0 0 4 4m-4-4-4 4M5 4h14",
    savings:"M12 3.5 5.5 6.2v4.6c0 4.2 2.8 6.6 6.5 7.5 3.7-.9 6.5-3.3 6.5-7.5V6.2L12 3.5Z",
    pots:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    debts:"M7 3.5h7L18 8v12.5H7V3.5Zm7 0V8h4M10 13h5M10 16.5h5",
    loans:"M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 19.5V19a4.5 4.5 0 0 1 9 0v.5M14 15.2a4 4 0 0 1 6 3.6v.7",
    reports:"M5 20V11m5 9V5m5 15v-6m5 6V8M3.5 20h17",
    settings:"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13a7.6 7.6 0 0 0 0-2l1.9-1.4-1.9-3.3-2.2 1a7.6 7.6 0 0 0-1.7-1l-.3-2.3H10l-.3 2.3a7.6 7.6 0 0 0-1.7 1l-2.2-1L3.9 9.6 5.8 11a7.6 7.6 0 0 0 0 2L3.9 14.4l1.9 3.3 2.2-1c.5.4 1.1.7 1.7 1l.3 2.3h3.8l.3-2.3c.6-.3 1.2-.6 1.7-1l2.2 1 1.9-3.3L19.4 13Z",
    menu:"M4.5 7.5h15M4.5 12h15M4.5 16.5h15",
    plus:"M12 5.5v13M5.5 12h13",
    check:"M5 12.5l4.2 4.2L19 7",
    warn:"M12 8.5v5m0 3.5h.01M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
    receipt:"M6 3.5h12v17l-2.4-1.4L13 20.5l-2.6-1.4L8 20.5l-2-1.4V3.5Zm3 5h6m-6 4h6",
    cash:"M3.5 7h17v10h-17V7Zm8.5 5a2 2 0 1 0 .01 0M6.5 9.5h.01M17.5 14.5h.01",
    bank:"M4 10 12 5l8 5M5 10h14M6.5 10.5v6.5M10 10.5v6.5m4-6.5v6.5m3.5-6.5v6.5M4.5 20h15",
    card:"M3.5 7.5h17v9h-17v-9Zm0 3h17",
    phone:"M8 3.5h8v17H8v-17Zm3 14h2"
  };
  CAT = {
    "Logement":{c:"#1E5081",b:"#EAF1F8",i:"M4 11.5 12 5l8 6.5M6 10.2V19h4v-5h4v5h4v-8.8"},
    "Alimentation":{c:"#3F9A5A",b:"#E7F3EB",i:"M6.5 8.5h11l-1 10.2a1 1 0 0 1-1 .9H9.5a1 1 0 0 1-1-.9L6.5 8.5Zm3 0V7a2.5 2.5 0 0 1 5 0v1.5"},
    "Factures":{c:"#B98A2E",b:"#F6EED7",i:"M13 3.5 6 13h5l-1 7.5L18 11h-5l1-7.5Z"},
    "Transport":{c:"#2A6FB0",b:"#E7F0F9",i:"M6 13l1.4-3.8A2 2 0 0 1 9.3 8h5.4a2 2 0 0 1 1.9 1.2L18 13m-12 0h12v3.5h-2M9.8 16.5H6V13Zm.7 0a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Zm8 0a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z"},
    "Restaurants":{c:"#B0693A",b:"#F6ECE1",i:"M7 3.5v6.5a2 2 0 0 0 4 0V3.5M9 10v10.5M16.5 3.5c-1.4 0-2.3 2-2.3 4.6s.9 3.9 2.3 3.9v8.5"},
    "Abonnements":{c:"#6E57B8",b:"#EEEAF8",i:"M5 9.5a6 6 0 0 1 10-2.2l1.8 1.8m0-4v4h-4M19 14.5a6 6 0 0 1-10 2.2L7 15m0 4v-4h4"},
    "Santé":{c:"#C15F4C",b:"#F6E7E2",i:"M12 20s-6.5-4-6.5-8.6A3.6 3.6 0 0 1 12 8.4a3.6 3.6 0 0 1 6.5 3C18.5 16 12 20 12 20Z"},
    "Divers":{c:"#5A6B78",b:"#EEF1F0",i:"M6.5 12h.01M12 12h.01M17.5 12h.01"}
  };

  /* ---------- State: demo data stored in USD minor units ---------- */
  state = {
    page: (this.MC_CLOUD && this.MC_CLOUD.enabled===true) ? "login" : ((this.props && this.props.startPage) || "dashboard"),
    currency: "USD",
    menuOpen: false, addOpen: false, toast: null,
    form: { amount:"", date:"", category:"Alimentation", method:"Carte", account:"Compte bancaire", payee:"", note:"", proof:null },
    fExpMonth:"current", fExpCat:"Toutes", fIncMonth:"current", fIncSource:"Toutes",
    accounts: [
      {id:"cash",    name:"Espèces",         type:"Argent liquide",       balance_minor:12000, currency:"USD", updated:"Aujourd'hui", linked:true,  icon:"cash",  c:"#3F9A5A", b:"#E7F3EB"},
      {id:"bank",    name:"Compte bancaire", type:"Banque",               balance_minor:73000, currency:"USD", updated:"Hier",        linked:true,  icon:"bank",  c:"#1E5081", b:"#EAF1F8"},
      {id:"paypal",  name:"PayPal",          type:"Portefeuille en ligne",balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#2A6FB0", b:"#E7F0F9"},
      {id:"cashapp", name:"Cash App",        type:"Portefeuille en ligne",balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#3F9A5A", b:"#E7F3EB"},
      {id:"zelle",   name:"Zelle",           type:"Transfert",            balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#6E57B8", b:"#EEEAF8"},
      {id:"momo",    name:"Mobile Money",    type:"Mobile",               balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"phone", c:"#B98A2E", b:"#F6EED7"}
    ],
    incomes: [
      {id:"i1", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 juil 2026",  date_iso:"2026-07-01", period:"2026-07", month:"Juillet", account:"Compte bancaire"},
      {id:"i2", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 juin 2026",  date_iso:"2026-06-01", period:"2026-06", month:"Juin",    account:"Compte bancaire"},
      {id:"i3", source:"Freelance",  label:"Mission design",      amount_minor:30000,  currency:"USD", freq:"Ponctuel", date:"12 juin 2026", date_iso:"2026-06-12", period:"2026-06", month:"Juin",    account:"PayPal"},
      {id:"i4", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 mai 2026",   date_iso:"2026-05-01", period:"2026-05", month:"Mai",     account:"Compte bancaire"}
    ],
    expenses: [
      {id:"e1", cat:"Logement",     payee:"Propriétaire",       amount_minor:60000, currency:"USD", method:"Virement",    account:"Compte bancaire", date:"1 juil 2026", date_iso:"2026-07-01", period:"2026-07", month:"Juillet", proof:"PDF"},
      {id:"e2", cat:"Alimentation", payee:"Supermarché",        amount_minor:18000, currency:"USD", method:"Carte",       account:"Compte bancaire", date:"3 juil 2026", date_iso:"2026-07-03", period:"2026-07", month:"Juillet", proof:null},
      {id:"e3", cat:"Divers",       payee:"Cadeau anniversaire",amount_minor:12000, currency:"USD", method:"Cash App",    account:"Cash App",        date:"4 juil 2026", date_iso:"2026-07-04", period:"2026-07", month:"Juillet", proof:null},
      {id:"e4", cat:"Santé",        payee:"Pharmacie",          amount_minor:8000,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"3 juil 2026", date_iso:"2026-07-03", period:"2026-07", month:"Juillet", proof:"Reçu"},
      {id:"e5", cat:"Factures",     payee:"Électricité",        amount_minor:7500,  currency:"USD", method:"Prélèvement", account:"Compte bancaire", date:"2 juil 2026", date_iso:"2026-07-02", period:"2026-07", month:"Juillet", proof:"Facture"},
      {id:"e6", cat:"Transport",    payee:"Carburant",          amount_minor:6000,  currency:"USD", method:"Espèces",     account:"Espèces",         date:"4 juil 2026", date_iso:"2026-07-04", period:"2026-07", month:"Juillet", proof:null},
      {id:"e7", cat:"Restaurants",  payee:"Le Bistro",          amount_minor:4500,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"5 juil 2026", date_iso:"2026-07-05", period:"2026-07", month:"Juillet", proof:"Photo"},
      {id:"e8", cat:"Abonnements",  payee:"Forfait téléphone",  amount_minor:4000,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"2 juil 2026", date_iso:"2026-07-02", period:"2026-07", month:"Juillet", proof:null}
    ],
    savings: [
      {id:"s1", name:"Fonds d'urgence", target_amount_minor:1000000, current_amount_minor:150000, currency:"USD", date:"Déc 2026",  status:"En cours"},
      {id:"s2", name:"Vacances",        target_amount_minor:200000,  current_amount_minor:90000,  currency:"USD", date:"Août 2026", status:"En cours"},
      {id:"s3", name:"Cadeau famille",  target_amount_minor:50000,   current_amount_minor:30000,  currency:"USD", date:"Sept 2026", status:"En cours"}
    ],
    pots: [
      {id:"p1", name:"iPhone 15",    target_amount_minor:100000, current_amount_minor:35000, currency:"USD", date:"Sept 2026",  priority:"Haute",   status:"En cours"},
      {id:"p2", name:"Casque audio", target_amount_minor:20000,  current_amount_minor:20000, currency:"USD", date:"Disponible", priority:"Moyenne", status:"Atteint"},
      {id:"p3", name:"Vélo",         target_amount_minor:50000,  current_amount_minor:30000, currency:"USD", date:"Nov 2026",   priority:"Basse",   status:"En cours"}
    ],
    debts: [
      {id:"d1", name:"Dette voiture",    creditor:"Concessionnaire Auto", total_amount_minor:250000, paid_amount_minor:80000, currency:"USD", due:"15 août 2026", status:"À jour"},
      {id:"d2", name:"Prêt téléphone",   creditor:"MobileStore",          total_amount_minor:40000,  paid_amount_minor:40000, currency:"USD", due:"—",            status:"Soldée"},
      {id:"d3", name:"Carte de crédit",  creditor:"Banque",               total_amount_minor:30000,  paid_amount_minor:10000, currency:"USD", due:"3 juil 2026",  status:"En retard"}
    ],
    loans: [
      {id:"l1", name:"Karim", rel:"Ami",      amount_lent_minor:20000, amount_repaid_minor:5000,  currency:"USD", due:"20 juil 2026", status:"En cours",   proof:true},
      {id:"l2", name:"Awa",   rel:"Sœur",     amount_lent_minor:10000, amount_repaid_minor:10000, currency:"USD", due:"—",            status:"Remboursé",  proof:true},
      {id:"l3", name:"Julie", rel:"Collègue", amount_lent_minor:8000,  amount_repaid_minor:0,     currency:"USD", due:"30 juil 2026", status:"En attente", proof:false}
    ],
    savingsContributions: [],
    purchaseContributions: [],
    debtPayments: [],
    loanRepayments: [],
    financialPlan: null
  };

  _viewportWidth(){
    try{
      if(typeof window!=="undefined" && Number(window.innerWidth)>0) return Number(window.innerWidth);
      if(typeof document!=="undefined" && document.documentElement && Number(document.documentElement.clientWidth)>0) return Number(document.documentElement.clientWidth);
    }catch(e){}
    return 0;
  }
  _isMobileViewport(){
    var w=this._viewportWidth();
    return w>0 && w<760;
  }
  get mode(){
    var forced=(this.props && this.props.mode) || "";
    if(forced==="mobile") return "mobile";
    if(this._isMobileViewport()) return "mobile";
    return forced==="desktop" ? "desktop" : "desktop";
  }
  pct(a,b){ return b?Math.max(0,Math.min(100,Math.round(a/b*100))):0; }
  statusStyle(s){
    const C=this.C;
    const map={ "À jour":[C.greenDk,C.greenBg], "Soldée":[C.greenDk,C.greenBg], "Remboursé":[C.greenDk,C.greenBg], "Atteint":[C.greenDk,C.greenBg],
      "En cours":[C.brand,C.brandBg], "En attente":[C.gold,C.goldBg], "En retard":[C.danger,C.dangerBg] };
    const [c,b]=map[s]||[C.ink2,"#EEF1F0"];
    return {display:"inline-flex",alignItems:"center",gap:"5px",fontSize:"11.5px",fontWeight:700,color:c,background:b,padding:"5px 10px",borderRadius:"99px",whiteSpace:"nowrap"};
  }
  prioStyle(p){
    const map={ "Haute":["#B98A2E","#F6EED7"], "Moyenne":["#2A6FB0","#E7F0F9"], "Basse":["#8B98A2","#EEF1F0"] };
    const [c,b]=map[p]||["#8B98A2","#EEF1F0"];
    return {fontSize:"11px",fontWeight:700,color:c,background:b,padding:"4px 9px",borderRadius:"99px"};
  }
  bar(pctNum, color){ return {height:"100%",width:pctNum+"%",background:color,borderRadius:"99px",animation:"mcBar .9s cubic-bezier(.3,.8,.3,1) both"}; }
  iconBox(c,b,size){ const s=size||38; return {width:s+"px",height:s+"px",borderRadius:"11px",background:b,color:c,display:"flex",alignItems:"center",justifyContent:"center",flex:"none"}; }

  go(p){
    var next=String(p||"dashboard");
    if(next!=="login") this._trackFeature(next,"feature_viewed",{source:"nav"});
    this.setState({page:next, menuOpen:false, addOpen:false});
  }
  closeAdd(){ this.setState({addOpen:false}); }
  toggleMenu(){ this.setState(s=>({menuOpen:!s.menuOpen})); }
  logout(){
    var self=this;
    if(this._cloudEnabled() && this._cloudReady() && this.sb.auth && this.sb.auth.signOut){
      try{
        this.sb.auth.signOut().catch(function(e){ self._cloudHandleError("signOut", e); });
      }catch(e){ this._cloudHandleError("signOut", e); }
      this._cloudSession=null;
      this._cloudUser=null;
    }
    this.setState({page:"login", menuOpen:false});
  }
  login(mode){
    if(this._cloudEnabled()){ this._cloudLogin(mode||"signin"); return; }
    this.go("dashboard");
  }
  setCur(c){ var self=this; this.setState({currency:this._cur(c)}, function(){ self._persist(); }); }
  ping(){ this.showToast("warn","Une dette arrive bientôt à échéance."); }
  showToast(type,msg){
    this.setState({toast:{type,msg}});
    if(this._isLoginVisible()) this._loginToast(type,msg);
    clearTimeout(this._t);
    this._t=setTimeout(()=>{ this.setState({toast:null}); this._loginToast(null); },2600);
  }
  _isLoginVisible(){
    try{
      if(this.state && this.state.page==="login") return true;
      if(!this._cloudEnabled()) return false;
      var email=document.querySelector('input[data-mc-login-email="1"],input[type="email"]');
      var pass=document.querySelector('input[data-mc-login-password="1"],input[type="password"],input[type="text"]');
      return !!(email && pass && document.body && document.body.innerText.indexOf("Bon retour")>=0);
    }catch(e){ return false; }
  }
  _loginToast(type,msg){
    try{
      var id="mc-login-toast", el=document.getElementById(id);
      if(!type||!msg){ if(el&&el.parentNode) el.parentNode.removeChild(el); return; }
      if(!el){ el=document.createElement("div"); el.id=id; document.body.appendChild(el); }
      var ok=type==="ok";
      el.setAttribute("role","status");
      el.textContent=msg;
      el.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:9999;pointer-events:none;display:inline-flex;align-items:center;gap:9px;background:#17293C;color:"+(ok?"#8FE0A5":"#F2CE7A")+";padding:12px 16px;border-radius:13px;font-size:13.5px;font-weight:600;box-shadow:0 12px 30px rgba(20,40,60,.28);max-width:90%;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif";
    }catch(e){}
  }
  _loginViewportHeight(){
    const vv=(typeof window!=="undefined") ? window.visualViewport : null;
    let h=vv && Number(vv.height)>0 ? Number(vv.height) : 0;
    if(!h && typeof window!=="undefined" && Number(window.innerHeight)>0) h=Number(window.innerHeight);
    if(!h && typeof document!=="undefined" && document.documentElement && Number(document.documentElement.clientHeight)>0) h=Number(document.documentElement.clientHeight);
    return h>0 ? Math.floor(h) : 0;
  }
  _rememberLoginStyle(el){
    if(!el || el.__mcLoginFitOriginalStyle!=null) return;
    el.__mcLoginFitOriginalStyle=el.getAttribute("style")||"";
  }
  _patchLoginStyle(el, styles){
    if(!el || !styles) return;
    this._rememberLoginStyle(el);
    Object.keys(styles).forEach(function(k){ el.style[k]=styles[k]; });
    el.dataset.mcLoginFit="1";
  }
  _clearLoginFit(){
    const nodes=(typeof document!=="undefined" && document.querySelectorAll) ? document.querySelectorAll("[data-mc-login-fit='1']") : [];
    Array.prototype.forEach.call(nodes, function(el){
      const original=el.__mcLoginFitOriginalStyle||"";
      el.style.cssText=original;
      if(el.dataset) delete el.dataset.mcLoginFit;
      delete el.__mcLoginFitOriginalStyle;
    });
  }
  _loginCardFromInput(input){
    let node=input;
    while(node && node!==document.body){
      const text=node.innerText||node.textContent||"";
      const r=node.getBoundingClientRect ? node.getBoundingClientRect() : {width:0,height:0};
      const st=window.getComputedStyle ? window.getComputedStyle(node) : null;
      const radius=st ? Number.parseFloat(st.borderRadius||"0") : 0;
      if(text.includes("Bon retour") && text.includes("Se connecter") && r.width>=280 && r.height>=320 && radius>=18) return node;
      node=node.parentElement;
    }
    return null;
  }
  _fitLoginScreen(){
    try{
      if(!this._cloudEnabled() || !this._isLoginVisible() || !this._isMobileViewport()){ this._clearLoginFit(); return; }
      const email=Array.prototype.filter.call(document.querySelectorAll('input[data-mc-login-email="1"],input[type="email"]'), (el)=>this._visibleEl(el))[0];
      const card=this._loginCardFromInput(email);
      if(!card?.parentElement) return;
      const stage=card.parentElement;
      const root=stage.parentElement && stage.parentElement!==document.body ? stage.parentElement : null;
      const vh=this._loginViewportHeight() || 680;
      const cardH=Math.ceil(card.getBoundingClientRect?.().height || 0);
      const padY=Math.max(20, Math.min(72, Math.round(vh*0.055)));
      const align=(cardH && cardH+padY*2>vh) ? "flex-start" : "center";
      if(root){
        this._patchLoginStyle(root,{minHeight:vh+"px",width:"100%",boxSizing:"border-box"});
      }
      this._patchLoginStyle(stage,{
        minHeight:vh+"px",
        width:"100%",
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        justifyContent:align,
        boxSizing:"border-box",
        padding:padY+"px 18px",
        overflowY:"auto"
      });
      this._patchLoginStyle(card,{
        margin:"0 auto",
        width:"100%",
        maxWidth:(this._viewportWidth() && this._viewportWidth()<430) ? "calc(100vw - 36px)" : "528px",
        boxSizing:"border-box"
      });
    }catch(e){ this._cloudHandleError("loginFit", e); }
  }
  setForm(k,v){ this.setState(s=>({form:Object.assign({},s.form,{[k]:v})})); }
  setAmount(e){ this.setForm("amount", e.target.value.replace(/[^0-9.,]/g,"")); }
  setPayee(e){ this.setForm("payee", e.target.value); }
  filterChip(active){ const C=this.C; return {padding:"8px 13px",borderRadius:"10px",fontSize:"12.5px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",border:"1px solid "+(active?"transparent":"#E1E4DE"),background:active?C.ink:"#fff",color:active?"#fff":C.ink2}; }

  openAdd(){
    var p=this.state.page;
    var map={available:"account", income:"income", savings:"saving", pots:"pot", debts:"debt", loans:"loan"};
    this._trackFeature("quick_add","feature_started",{source:p});
    this.setState({menuOpen:false});
    if(map[p]) this.openForm(map[p]); else this.setState({addOpen:true, menuOpen:false});
  }
  cotiser(name){ this.openForm("potAdd",{name:name}); }
  epargner(name){ this.openForm("saveAdd",{name:name}); }
  rembourserDette(name){ this.openForm("debtPay",{name:name}); }
  relance(name){ this.openForm("loanFollow",{name:name}); }

  pickProofDemo(){
    var self=this;
    if(this.state.form.proof){ this.setForm("proof",null); this._pendingProofs=[]; return; }
    var fi=document.createElement("input"); fi.type="file"; fi.multiple=true; fi.accept="image/png,image/jpeg,image/webp,application/pdf";
    fi.onchange=function(){
      var files=[];
      for(var i=0;i<fi.files.length;i++){
        var f=fi.files[i];
        if(self.MC_OK_TYPES.indexOf(f.type)<0){ self.showToast("warn","Type refusé."); continue; }
        if(f.size>self.MC_MAX){ self.showToast("warn","Fichier trop lourd (5 Mo)."); continue; }
        files.push(f);
      }
      if(files.length){ self._pendingProofs=files; self.setForm("proof", files.length===1?files[0].name:(files.length+" fichiers")); }
    };
    fi.click();
  }

  submitExpense(){
    var self=this, f=this.state.form, cur=this._cur(this.state.currency);
    var amt=this.mParse(f.amount, cur);
    if(amt<=0){ this.showToast("warn","Indique un montant pour enregistrer."); return; }
    const id=this._uid(), iso=this._isoToday();
    const exp={id:id, cat:f.category, payee:f.payee||"Dépense", amount_minor:amt, currency:cur, method:f.method, account:f.account, date:this._shortFromIso(iso), date_iso:iso, period:this._periodFromIso(iso), month:this._monthFromIso(iso), proof:f.proof};
    var files=this._pendingProofs||[];
    this.setState(function(s){
      var accs=s.accounts.map(function(a){
        if(a.name!==f.account) return a;
        if(self._rc(a)!==cur) return a;                       // different currency: leave balance unchanged
        return Object.assign({},a,{balance_minor:a.balance_minor-amt, updated:"Aujourd'hui"});
      });
      return { expenses:[exp].concat(s.expenses), accounts:accs, addOpen:false, form:Object.assign({},s.form,{amount:"",payee:"",proof:null}) };
    }, function(){
      self._persist();
      if(files.length){ self._saveFiles("expense:"+id, files).then(function(n){ if(n) self.showToast("ok","Preuve jointe à la dépense."); }); }
    });
    this._pendingProofs=[];
    this._trackFeature("expenses","feature_completed",{source:"quick_add",has_account:!!f.account,has_proof:!!files.length});
    this.showToast("ok","Cette dépense a été enregistrée.");
  }

  navMeta(){ return [
    {id:"dashboard",label:"Tableau de bord",icon:this.ICONS.home},
    {id:"available",label:"Argent disponible",icon:this.ICONS.wallet},
    {id:"income",label:"Revenus",icon:this.ICONS.income},
    {id:"expenses",label:"Dépenses",icon:this.ICONS.expense},
    {id:"savings",label:"Épargne",icon:this.ICONS.savings},
    {id:"pots",label:"Mes Cagnottes",icon:this.ICONS.pots},
    {id:"debts",label:"Dettes",icon:this.ICONS.debts},
    {id:"loans",label:"Argent prêté",icon:this.ICONS.loans},
    {id:"reports",label:"Rapports",icon:this.ICONS.reports},
    {id:"settings",label:"Paramètres",icon:this.ICONS.settings}
  ]; }
  titleOf(p){ const m={dashboard:"Tableau de bord",available:"Argent disponible",income:"Revenus",expenses:"Dépenses",savings:"Épargne",pots:"Mes Cagnottes",debts:"Dettes",loans:"Argent prêté",reports:"Rapports",settings:"Paramètres"}; return m[p]||"Mon Coffre"; }

  /* ---------- Derived views: integers -> formatted strings ---------- */
  dSav(g){
    const cur=this._rc(g), p=this.pct(g.current_amount_minor,g.target_amount_minor);
    return Object.assign({},g,{pctNum:p,pctStr:p+" %",savedStr:this.mFmt(g.current_amount_minor,cur),totalStr:this.mFmt(g.target_amount_minor,cur),remainStr:this.mFmt(Math.max(0,g.target_amount_minor-g.current_amount_minor),cur),barStyle:this.bar(p,this.C.green),statusSty:this.statusStyle(g.status),onAdd:()=>this.epargner(g.name)});
  }
  dPot(g){
    const cur=this._rc(g), p=this.pct(g.current_amount_minor,g.target_amount_minor), done=p>=100;
    return Object.assign({},g,{pctNum:p,pctStr:p+" %",savedStr:this.mFmt(g.current_amount_minor,cur),priceStr:this.mFmt(g.target_amount_minor,cur),remainStr:this.mFmt(Math.max(0,g.target_amount_minor-g.current_amount_minor),cur),done:done,barStyle:this.bar(p,done?this.C.green:this.C.brand),statusSty:this.statusStyle(g.status),prioSty:this.prioStyle(g.priority),msg: done?"Objectif atteint. Tu peux acheter cet objet sans toucher à ton budget principal.":"Achat non recommandé pour le moment.",msgSty: Object.assign({display:"flex",alignItems:"flex-start",gap:"9px",borderRadius:"13px",padding:"12px 13px",fontSize:"12.5px",fontWeight:600,lineHeight:"1.4"}, done?{color:"#2C6B41",background:"#E7F3EB",border:"1px solid #CBE6D3"}:{color:"#8A6417",background:"#F8F1DC",border:"1px solid #EBDCAF"}),onCotiser:()=>this.cotiser(g.name)});
  }
  dDebt(g, decision){
    const cur=this._rc(g), total=Math.max(0,Math.trunc(Number(g.total_amount_minor)||0)), paid=this._debtPaidMinor(total,g.paid_amount_minor), p=this.pct(paid,total), rem=Math.max(0,total-paid);
    const detail=decision && decision.byId ? decision.byId[g.id] : null;
    return Object.assign({},g,{pctNum:p,pctStr:p+" %",paidStr:this.mFmt(paid,cur),totalStr:this.mFmt(total,cur),remainStr:this.mFmt(rem,cur),barStyle:this.bar(p,g.status==="En retard"?"#C99A38":this.C.green),statusSty:this.statusStyle(g.status),late:g.status==="En retard",open:rem>0,decisionRank:detail?detail.rank:null,decisionPayStr:detail?this.mFmt(detail.monthly,cur):"",decisionDoneStr:detail&&detail.done?detail.done.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):"Budget à définir",decisionBadge:detail&&detail.rank===1?"Priorité maintenant":(detail?"Ensuite":""),onPay:()=>this.rembourserDette(g.name)});
  }
  dLoan(g){
    const cur=this._rc(g), p=this.pct(g.amount_repaid_minor,g.amount_lent_minor), rem=Math.max(0,g.amount_lent_minor-g.amount_repaid_minor);
    return Object.assign({},g,{pctNum:p,pctStr:p+" %",lentStr:this.mFmt(g.amount_lent_minor,cur),repaidStr:this.mFmt(g.amount_repaid_minor,cur),remainStr:this.mFmt(rem,cur),barStyle:this.bar(p,this.C.brand),statusSty:this.statusStyle(g.status),initials:g.name.slice(0,1),open:rem>0,onRemind:()=>this.relance(g.name)});
  }
  dExp(e){ const cat=this.CAT[e.cat]||this.CAT["Divers"]; return Object.assign({},e,{amountStr:this.mFmt(e.amount_minor,this._rc(e)),iconStyle:this.iconBox(cat.c,cat.b,40),icon:cat.i,hasProof:!!e.proof,proofLabel:e.proof||""}); }
  dInc(i){ return Object.assign({},i,{amountStr:this.mFmt(i.amount_minor,this._rc(i))}); }
  dAcc(a){ return Object.assign({},a,{balStr:this.mFmt(a.balance_minor,this._rc(a)),iconStyle:this.iconBox(a.c,a.b,44),icon:this.ICONS[a.icon],borderStyle:a.linked?"1px solid #E7E9E4":"1.5px dashed #D3D8D1",footNote:a.linked?("Mis à jour · "+a.updated):"Compte non lié",cta:a.linked?"Mettre à jour":"Lier ce compte",onCta:()=>this.openForm("account",{account:a})}); }

  renderVals(){
    window.__mc=this;
    const C=this.C, S=this.state, mode=this.mode;
    const isDesktop=mode==="desktop", isMobile=mode==="mobile";
    const page=S.page;
    const acc=S.accounts, inc=S.incomes, exp=S.expenses, sav=S.savings, pot=S.pots, deb=S.debts, loa=S.loans;
    const cur=this._cur(S.currency), self=this, currentPeriod=this._currentPeriod();
    const selectedIncomePeriod=S.fIncMonth==="current"?currentPeriod:S.fIncMonth;
    const selectedExpensePeriod=S.fExpMonth==="current"?currentPeriod:S.fExpMonth;

    // Totals: integers only, active currency only, no conversion.
    const totalAvailable=this._sum(acc.filter(a=>a.linked),"balance_minor");
    const monthIncome=this._sum(inc.filter(i=>this._recordInPeriod(i,currentPeriod)),"amount_minor");
    const monthExpense=this._sum(exp.filter(e=>this._recordInPeriod(e,currentPeriod)),"amount_minor");
    const totalSavings=this._sum(sav,"current_amount_minor");
    let totalDebt=0; deb.forEach(d=>{ if(self._same(d)) totalDebt+=Math.max(0,d.total_amount_minor-d.paid_amount_minor); });
    let totalLent=0; loa.forEach(l=>{ if(self._same(l)) totalLent+=Math.max(0,l.amount_lent_minor-l.amount_repaid_minor); });
    const net=monthIncome-monthExpense;
    const accCount=acc.filter(a=>self._same(a)).length, incCount=inc.filter(i=>self._same(i)).length, expCount=exp.filter(e=>self._same(e)).length;
    const savCount=sav.filter(g=>self._same(g)).length, potCount=pot.filter(g=>self._same(g)).length, debCount=deb.filter(d=>self._same(d)).length, loanCount=loa.filter(l=>self._same(l)).length;
    const hasUserData=!!(accCount||incCount||expCount||savCount||potCount||debCount||loanCount);
    const debtDecision=this._debtDecisionPlan();
    const plural=(n,s,p)=>n+" "+(n>1?p:s);
    const coachLine=!hasUserData?"Ajoute ton premier revenu pour commencer.":(debtDecision.ok?debtDecision.coachLine:(!incCount?"Ajoute ton premier revenu pour calculer ton argent disponible.":(!expCount?"Ajoute une dépense fixe pour rendre ton plan plus précis.":"Tu avances bien ce mois-ci. Ton coffre est stable.")));

    const navList=this.navMeta().map(n=>{ const active=page===n.id; return {label:n.label,icon:n.icon,onClick:()=>this.go(n.id),
      style:{display:"flex",alignItems:"center",gap:"12px",padding:"11px 12px",borderRadius:"12px",width:"100%",textAlign:"left",cursor:"pointer",fontSize:"14px",fontWeight:active?700:600,transition:"background .15s",background:active?C.brandBg:"transparent",color:active?C.brand:C.ink2},
      hover: active?"background:"+C.brandBg:"background:#F4F6F3"}; });
    const curList=[["USD","$"],["EUR","€"],["XOF","FCFA"]].map(([code,lab])=>{ const active=S.currency===code; return {label:lab,onClick:()=>this.setCur(code),
      style:{padding:"6px 12px",borderRadius:"9px",fontSize:"12.5px",fontWeight:700,cursor:"pointer",background:active?"#17293C":"transparent",color:active?"#fff":C.ink2}}; });
    const tabMeta=[{id:"dashboard",label:"Accueil",icon:this.ICONS.home},{id:"expenses",label:"Dépenses",icon:this.ICONS.expense},{id:"pots",label:"Cagnottes",icon:this.ICONS.pots},{id:"debts",label:"Dettes",icon:this.ICONS.debts},{id:"menu",label:"Menu",icon:this.ICONS.menu}];
    const tabList=tabMeta.map(t=>{ const active=t.id==="menu"?S.menuOpen:(page===t.id&&!S.menuOpen); return {label:t.label,icon:t.icon,onClick:()=> t.id==="menu"?this.toggleMenu():this.go(t.id),
      style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",padding:"4px 2px",cursor:"pointer",background:"none",color:active?C.brand:"#A2AEB4"}}; });
    const menuMeta=[{id:"available",label:"Argent disponible",icon:this.ICONS.wallet,c:C.brand,b:C.brandBg},{id:"income",label:"Revenus",icon:this.ICONS.income,c:C.greenDk,b:C.greenBg},{id:"savings",label:"Épargne",icon:this.ICONS.savings,c:C.greenDk,b:C.greenBg},{id:"loans",label:"Argent prêté",icon:this.ICONS.loans,c:C.brand,b:C.brandBg},{id:"reports",label:"Rapports",icon:this.ICONS.reports,c:"#6E57B8",b:"#EEEAF8"},{id:"settings",label:"Paramètres",icon:this.ICONS.settings,c:C.ink2,b:"#EEF1F0"}];
    const menuItems=menuMeta.map(m=>({label:m.label,icon:m.icon,onClick:()=>this.go(m.id),iconStyle:this.iconBox(m.c,m.b,42)}));

    const scMeta=[
      {label:"Argent disponible",value:this.mFmt(totalAvailable,cur),icon:this.ICONS.wallet,c:C.green,b:C.greenBg,sub:accCount?plural(accCount,"compte actif","comptes actifs"):"Ajoute ton premier compte",page:"available"},
      {label:"Revenus du mois",value:this.mFmt(monthIncome,cur),icon:this.ICONS.income,c:C.brand,b:C.brandBg,sub:incCount?this._periodLabel(currentPeriod):"Ajoute ton premier revenu",page:"income"},
      {label:"Dépenses du mois",value:this.mFmt(monthExpense,cur),icon:this.ICONS.expense,c:C.gold,b:C.goldBg,sub:expCount?this._periodLabel(currentPeriod):"Ajoute ta première dépense",page:"expenses"},
      {label:"Épargne totale",value:this.mFmt(totalSavings,cur),icon:this.ICONS.savings,c:C.green,b:C.greenBg,sub:(savCount||potCount)?plural(savCount+potCount,"objectif","objectifs"):"Crée ta première cagnotte",page:"savings"},
      {label:"Dettes restantes",value:this.mFmt(totalDebt,cur),icon:this.ICONS.debts,c:C.danger,b:C.dangerBg,sub:debCount?"À rembourser":"Renseigne une dette",page:"debts"},
      {label:"Prêté à récupérer",value:this.mFmt(totalLent,cur),icon:this.ICONS.loans,c:C.brand,b:C.brandBg,sub:loanCount?plural(loanCount,"personne","personnes"):"Ajoute un prêt",page:"loans"}
    ];
    const summaryCards=scMeta.map(c=>({label:c.label,value:c.value,icon:c.icon,sub:c.sub,onClick:()=>this.go(c.page),iconStyle:this.iconBox(c.c,c.b,38)}));

    const expIncPct=this.pct(monthExpense,monthIncome);
    const dashGoals=[];
    if(sav[0]) dashGoals.push(Object.assign(this.dSav(sav[0]),{kicker:"ÉPARGNE",icon:this.ICONS.savings,iconStyle:this.iconBox(C.green,C.greenBg,40),pctColor:C.greenDk}));
    if(pot[0]) dashGoals.push((()=>{ const g=this.dPot(pot[0]); return {name:g.name,kicker:"CAGNOTTE",icon:this.ICONS.pots,iconStyle:this.iconBox(C.brand,C.brandBg,40),pctColor:C.brand,pctStr:g.pctStr,barStyle:g.barStyle,savedStr:g.savedStr,totalStr:g.priceStr,remainStr:g.remainStr}; })());

    const chip=(active,activeStyle)=> Object.assign({display:"inline-flex",alignItems:"center",gap:"6px",padding:"9px 13px",borderRadius:"11px",fontSize:"13px",fontWeight:600,cursor:"pointer",border:"1px solid "+(active?"transparent":"#E1E4DE"),background:active?activeStyle.bg:"#fff",color:active?activeStyle.c:C.ink2},{});
    const catChips=Object.keys(this.CAT).map(k=>{ const active=S.form.category===k; const cat=this.CAT[k]; return {label:k,onClick:()=>this.setForm("category",k),style:chip(active,{bg:cat.b,c:cat.c})}; });
    const methodChips=["Carte","Espèces","Virement","Cash App","PayPal","Mobile Money"].map(m=>{ const active=S.form.method===m; return {label:m,onClick:()=>this.setForm("method",m),style:chip(active,{bg:C.brandBg,c:C.brand})}; });

    const toast=S.toast; const tOk=toast&&toast.type==="ok";
    const toastStyle=toast?{display:"inline-flex",alignItems:"center",gap:"9px",background:"#17293C",color:"#fff",padding:"12px 16px",borderRadius:"13px",fontSize:"13.5px",fontWeight:600,boxShadow:"0 12px 30px rgba(20,40,60,.28)",animation:"mcDown .3s cubic-bezier(.2,.8,.2,1) both",maxWidth:"90%"}:{};
    if(toast){ toastStyle.color = tOk?"#8FE0A5":"#F2CE7A"; }

    const filt=(a)=>this.filterChip(a);
    const incMonths=[{value:"Tous",label:"Tous"}].concat(this._periodOptions(inc)).map(m=>({label:m.label,onClick:()=>this.setState({fIncMonth:m.value}),style:filt(selectedIncomePeriod===m.value)}));
    const incSources=["Toutes","Salaire","Freelance"].map(m=>({label:m,onClick:()=>this.setState({fIncSource:m}),style:filt(S.fIncSource===m)}));
    const expMonths=[{value:"Tous",label:"Tous"}].concat(this._periodOptions(exp)).map(m=>({label:m.label,onClick:()=>this.setState({fExpMonth:m.value}),style:filt(selectedExpensePeriod===m.value)}));
    const expCats=["Toutes"].concat(Object.keys(this.CAT)).map(m=>({label:m,onClick:()=>this.setState({fExpCat:m}),style:filt(S.fExpCat===m)}));
    const catMap={}; exp.filter(e=>self._recordInPeriod(e,currentPeriod)&&self._same(e)).forEach(e=>{catMap[e.cat]=(catMap[e.cat]||0)+e.amount_minor;});
    const catMax=Math.max.apply(null,[1].concat(Object.keys(catMap).map(k=>catMap[k])));
    const catBreak=Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]).map(k=>{const cat=this.CAT[k]||this.CAT["Divers"]; return {cat:k,amountStr:this.mFmt(catMap[k],cur),color:cat.c,barStyle:{height:"10px",width:this.pct(catMap[k],catMax)+"%",background:cat.c,borderRadius:"99px",animation:"mcBar .9s ease both"},pctStr:this.pct(catMap[k],monthExpense)+" %"};});
    const rollingPeriods=this._rollingPeriods(6);
    const sumPeriod=(list,field,period)=>this._sum(list.filter(r=>this._recordInPeriod(r,period)),field);
    const im=rollingPeriods.map(period=>[this._periodChartLabel(period),sumPeriod(inc,"amount_minor",period),period]); const imMax=Math.max.apply(null,[1].concat(im.map(x=>x[1])));
    const incomeMonths=im.map(x=>({m:x[0],amountStr:this.mFmt(x[1],cur),barStyle:{width:"58%",height:Math.round(x[1]/imMax*112)+"px",background:x[2]===currentPeriod?C.brand:"#BED0E3",borderRadius:"7px 7px 3px 3px"}}));
    let runningNet=0;
    const tv=rollingPeriods.map(period=>{ runningNet+=sumPeriod(inc,"amount_minor",period)-sumPeriod(exp,"amount_minor",period); return [this._periodChartLabel(period),Math.max(0,runningNet)]; }); const tMax=Math.max.apply(null,[1].concat(tv.map(x=>x[1])));
    const tpts=tv.map((x,i)=>[Math.round(i/(tv.length-1)*300),Math.round(110-(x[1]/tMax)*86-10)]);
    const trendLine=tpts.map(p=>p[0]+","+p[1]).join(" ");
    const trendArea="0,112 "+trendLine+" 300,112";
    const trendLabels=tv.map(x=>x[0]);
    return {
      isDesktop, isMobile, mode,
      pLogin: page==="login", inApp: page!=="login",
      pDash: page==="dashboard", pAvail: page==="available", pInc: page==="income", pExp: page==="expenses",
      pSave: page==="savings", pPots: page==="pots", pDebts: page==="debts", pLoans: page==="loans", pReports: page==="reports", pSettings: page==="settings",
      pageTitle:this.titleOf(page), dateStr:new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric"}).format(new Date()), name:"NYPAL", avatar:"NY",
      greetHi:"Bonjour, NYPAL", coachLine:coachLine,
      mobileTitle: page==="dashboard"?"Bonjour, NYPAL":this.titleOf(page),
      mobileSub: page==="dashboard"?coachLine:"Mon Coffre",
      navList, curList, tabList, menuItems, curSym:this.curSym(),
      openAdd:()=>this.openAdd(), closeAdd:()=>this.closeAdd(), toggleMenu:()=>this.toggleMenu(), logout:()=>this.logout(), ping:()=>this.ping(),
      onLogin:()=>this.login("signin"), goPots:()=>this.go("pots"), goDebts:()=>this.go("debts"),
      menuOpen:S.menuOpen, addOpen:S.addOpen,
      summaryCards, resumeInc:this.mFmt(monthIncome,cur), resumeExp:this.mFmt(monthExpense,cur), netStr:this.mFmt(net,cur,true),
      barIncStyle:this.bar(100,C.green), barExpStyle:this.bar(expIncPct,C.gold), dashGoals,
      form:S.form, setAmount:e=>this.setAmount(e), setPayee:e=>this.setPayee(e), catChips, methodChips,
      pickProofDemo:()=>this.pickProofDemo(), submitExpense:()=>this.submitExpense(),
      proofTypes:["Photo","Screenshot","PDF","Reçu","Facture"],
      proofTitle: S.form.proof? "Preuve jointe — "+S.form.proof : "Joindre une preuve",
      proofHint: S.form.proof? "Touche pour retirer" : "Photo, screenshot, PDF, reçu ou facture",
      addOverlayStyle:{position:"absolute",inset:0,zIndex:50,display:"flex",alignItems:isDesktop?"center":"flex-end",justifyContent:"center",padding:isDesktop?"24px":"0"},
      toast, toastStyle, toastMsg:toast?toast.msg:"", toastIcon:tOk?this.ICONS.check:this.ICONS.warn,
      accountsView:acc.map(a=>this.dAcc(a)), totalAvailableStr:this.mFmt(totalAvailable,cur),
      expensesView: exp.filter(e=>(selectedExpensePeriod==="Tous"||this._recordInPeriod(e,selectedExpensePeriod))&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat)).map(e=>this.dExp(e)),
      monthExpenseStr:this.mFmt(monthExpense,cur),
      incomesView: inc.filter(i=>(selectedIncomePeriod==="Tous"||this._recordInPeriod(i,selectedIncomePeriod))&&(S.fIncSource==="Toutes"||i.source===S.fIncSource)).map(i=>this.dInc(i)),
      monthIncomeStr:this.mFmt(monthIncome,cur),
      savingsView: sav.map(g=>this.dSav(g)), savingsTotalStr:this.mFmt(totalSavings,cur), savingsTargetStr:this.mFmt(this._sum(sav,"target_amount_minor"),cur),
      potsView: pot.map(g=>this.dPot(g)),
      debtsView: deb.map(g=>this.dDebt(g,debtDecision)), debtTotalStr:this.mFmt(totalDebt,cur), debtDecision:debtDecision,
      loansView: loa.map(g=>this.dLoan(g)), lentTotalStr:this.mFmt(totalLent,cur), lentBackStr:this.mFmt(this._sum(loa,"amount_repaid_minor"),cur),
      incMonths, incSources, expMonths, expCats, catBreak, incomeMonths, trendLine, trendArea, trendLabels,
      demoIncome:()=>this.openForm("income"),
      expEmpty: exp.filter(e=>(selectedExpensePeriod==="Tous"||this._recordInPeriod(e,selectedExpensePeriod))&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat)).length===0,
      incEmpty: inc.filter(i=>(selectedIncomePeriod==="Tous"||this._recordInPeriod(i,selectedIncomePeriod))&&(S.fIncSource==="Toutes"||i.source===S.fIncSource)).length===0
    };
  }

  /* =================================================================
     COUCHE BACKEND — persistance locale, migration, justificatifs
     ================================================================= */

  MC_OK_TYPES = ["image/png","image/jpeg","image/webp","application/pdf"];
  MC_MAX = 5*1024*1024;
  _moisFr = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
  _moisLong = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  _uid(){
    if(typeof crypto!=="undefined" && crypto.randomUUID) return crypto.randomUUID();
    var s=""; for(var i=0;i<32;i++) s+=Math.floor(Math.random()*16).toString(16);
    return s.slice(0,8)+"-"+s.slice(8,12)+"-4"+s.slice(13,16)+"-"+(8+Math.floor(Math.random()*4)).toString(16)+s.slice(17,20)+"-"+s.slice(20);
  }
  _isUuid(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||"")); }
  _ensureUuid(v){ return this._isUuid(v)?String(v):this._uid(); }
  _dataKeys(){ return ["accounts","incomes","expenses","savings","pots","debts","loans","savingsContributions","purchaseContributions","debtPayments","loanRepayments"]; }
  _snapshotFromState(){
    var s=this.state, snapshot={v:2, currency:s.currency};
    this._dataKeys().forEach(function(k){ snapshot[k]=Array.isArray(s[k])?s[k]:[]; });
    snapshot.financialPlan=this._plan();
    return snapshot;
  }
  _esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  _safeImageUrl(url){
    var s=String(url||"").trim();
    if(!s) return "";
    if(/^https:\/\//i.test(s)) return s;
    if(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s)) return s;
    return "";
  }
  _evalSlug(v, fallback){
    var s=String(v||fallback||"").toLowerCase().replace(/[^a-z0-9_.:-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,64);
    return s || String(fallback||"feature");
  }
  _evalOutcome(eventName){
    var e=String(eventName||"");
    if(e.includes("started")) return "started";
    if(e.includes("completed")) return "completed";
    if(e.includes("skipped")) return "skipped";
    if(e.includes("failed")) return "failed";
    if(e.includes("feedback")) return "feedback";
    return "info";
  }
  _evalFeatureForForm(kind){
    var map={account:"available",income:"income",saving:"savings",saveAdd:"savings",pot:"pots",potAdd:"pots",debt:"debts",debtPay:"debts",loan:"loans",loanFollow:"loans"};
    return map[kind]||"quick_add";
  }
  _evalSafeMeta(meta){
    var allowed={source:1,kind:1,step:1,screen:1,result:1,reason:1,mode:1,has_account:1,has_proof:1,strategy:1,currency:1,section:1,action:1};
    var blocked=/(email|password|secret|token|service|amount|merchant|payee|file|path|name|creditor|borrower|note)/i;
    var out={};
    Object.keys(meta||{}).forEach(function(k){
      if(!allowed[k] || blocked.test(k)) return;
      var v=meta[k];
      if(v==null) return;
      if(typeof v==="boolean"){ out[k]=v; return; }
      if(typeof v==="number" && isFinite(v)){ out[k]=Math.round(v); return; }
      var s=String(v).slice(0,80);
      if(!blocked.test(s)) out[k]=s;
    });
    return out;
  }
  _evalSessionId(){
    var key="moncoffre.eval.session";
    try{
      if(typeof sessionStorage!=="undefined"){
        var cur=sessionStorage.getItem(key);
        if(cur) return cur;
        var id=this._uid();
        sessionStorage.setItem(key,id);
        return id;
      }
    }catch(e){ this._evalSessionStorageUnavailable=true; }
    if(!this._evalSession) this._evalSession=this._uid();
    return this._evalSession;
  }
  _evalStoreKey(){
    var uid=(this._cloudUser&&this._cloudUser.id)?this._cloudUser.id:"local";
    return this._EVAL_KEY+"."+uid;
  }
  _evalReadEvents(){
    try{
      var raw=localStorage.getItem(this._evalStoreKey());
      var rows=raw?JSON.parse(raw):[];
      return Array.isArray(rows)?rows:[];
    }catch(e){ return []; }
  }
  _evalStoreEvent(row){
    try{
      var rows=this._evalReadEvents();
      rows.push(row);
      if(rows.length>500) rows=rows.slice(rows.length-500);
      localStorage.setItem(this._evalStoreKey(), JSON.stringify(rows));
    }catch(e){ this._evalLocalStorageDisabled=true; }
  }
  _cloudInsertFeatureEvent(row){
    var self=this;
    if(!this._cloudEnabled() || !this._cloudReady() || !this._cloudUser || this._featureEventsCloudDisabled) return Promise.resolve(false);
    var cloudRow=Object.assign({},row,{user_id:this._cloudUser.id});
    return this.sb.from("feature_events").insert([cloudRow]).then(function(r){
      if(r.error) throw r.error;
      return true;
    }).catch(function(e){
      var msg=String((e&&(e.message||e.code||e.details))||"");
      if(msg.includes("feature_events") || msg.includes("PGRST205") || msg.includes("42P01")){
        self._featureEventsCloudDisabled=true;
        return false;
      }
      self._cloudHandleError("featureEvent", e);
      return false;
    });
  }
  _trackFeature(featureId, eventName, meta){
    try{
      var row={
        id:this._uid(),
        session_id:this._evalSessionId(),
        feature_id:this._evalSlug(featureId,"feature"),
        event_name:this._evalSlug(eventName,"feature_viewed"),
        page_id:this._evalSlug((this.state&&this.state.page)||"dashboard","dashboard"),
        outcome:this._evalOutcome(eventName),
        metadata:this._evalSafeMeta(meta||{}),
        device_mode:this.mode==="mobile"?"mobile":"desktop",
        app_version:this._APP_VERSION,
        created_at:new Date().toISOString()
      };
      this._evalStoreEvent(row);
      this._cloudInsertFeatureEvent(row);
      return row;
    }catch(e){ return null; }
  }
  _featureRegistry(){
    return [
      {id:"dashboard",label:"Tableau de bord",goal:"Comprendre la situation en moins d'une minute."},
      {id:"available",label:"Argent disponible",goal:"Savoir combien reste vraiment utilisable."},
      {id:"income",label:"Revenus",goal:"Suivre les sources d'argent."},
      {id:"expenses",label:"Dépenses",goal:"Enregistrer et expliquer les sorties d'argent."},
      {id:"savings",label:"Épargne",goal:"Avancer sur le coussin de sécurité."},
      {id:"pots",label:"Cagnottes",goal:"Financer les projets sans dette."},
      {id:"debts",label:"Dettes",goal:"Choisir quoi payer en premier."},
      {id:"loans",label:"Argent prêté",goal:"Suivre les remboursements reçus."},
      {id:"reports",label:"Rapports",goal:"Voir l'évolution mensuelle."},
      {id:"onboarding",label:"Onboarding",goal:"Configurer vite sans jargon."},
      {id:"quick_add",label:"Ajout rapide",goal:"Créer une ligne sans friction."},
      {id:"financial_plan",label:"Plan financier",goal:"Transformer les données en décisions."}
    ];
  }
  _productEvaluation(){
    var events=this._evalReadEvents(), by={}, registry=this._featureRegistry();
    registry.forEach(function(f){ by[f.id]={id:f.id,label:f.label,goal:f.goal,views:0,starts:0,completes:0,skips:0,fails:0,last:null,score:0}; });
    events.forEach(function(e){
      var id=String(e.feature_id||"feature");
      if(!by[id]) by[id]={id:id,label:id,goal:"Module suivi automatiquement.",views:0,starts:0,completes:0,skips:0,fails:0,last:null,score:0};
      if(e.event_name==="feature_viewed") by[id].views++;
      if(e.event_name==="feature_started") by[id].starts++;
      if(e.event_name==="feature_completed") by[id].completes++;
      if(e.event_name==="feature_skipped") by[id].skips++;
      if(e.event_name==="feature_failed") by[id].fails++;
      by[id].last=e.created_at||by[id].last;
    });
    var features=Object.keys(by).map(function(k){
      var f=by[k], attempts=f.starts+f.completes+f.skips+f.fails, completion=attempts?Math.round(f.completes/attempts*100):0;
      var usage=Math.min(50,(f.views*4)+(f.starts*8)+(f.completes*12));
      var quality=attempts?Math.max(0,50+completion/2-(f.fails*12)-(f.skips*4)):(f.views?32:0);
      f.completion=completion;
      f.score=Math.max(0,Math.min(100,Math.round(usage+quality)));
      return f;
    }).sort(function(a,b){ return b.score-a.score || b.views-a.views; });
    return {features:features,recommendations:this._productRecommendations(features,events),eventCount:events.length};
  }
  _productRecommendations(features, events){
    var recs=[];
    features.forEach(function(f){
      var attempts=f.starts+f.completes+f.skips+f.fails;
      if(f.fails>0) recs.push({priority:"Haute",title:"Corriger les erreurs sur "+f.label,detail:f.fails+" échec(s) détecté(s). Vérifier ce parcours avant d'ajouter une nouvelle fonctionnalité."});
      if(attempts>=2 && f.completion<50) recs.push({priority:"Haute",title:"Simplifier "+f.label,detail:"Beaucoup d'actions commencent mais ne finissent pas. Réduire les champs ou mieux expliquer l'étape."});
      if(f.views===0 && ["debts","reports","financial_plan"].includes(f.id)) recs.push({priority:"Moyenne",title:"Rendre visible "+f.label,detail:"Ce module porte une forte valeur de décision, mais il n'est pas encore consulté."});
      if(f.views>=3 && f.starts===0 && ["income","expenses","debts","pots"].includes(f.id)) recs.push({priority:"Moyenne",title:"Ajouter une action plus directe dans "+f.label,detail:"La page est vue, mais aucune action n'est lancée depuis ce module."});
    });
    if(!events.length) recs.push({priority:"Moyenne",title:"Collecter une première journée d'usage",detail:"Utilise l'app normalement. Le rapport devient utile après quelques navigations et créations."});
    if(!recs.length) recs.push({priority:"Basse",title:"Continuer à améliorer les décisions",detail:"Aucun blocage évident. Prochaine priorité : rendre les recommandations plus personnalisées."});
    return recs.slice(0,6);
  }
  _productEvaluationHtml(){
    var e=this._productEvaluation();
    var featureRows=e.features.slice(0,6).map((f)=>{
      return '<div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 12px;background:#FAFBF9;border:1px solid #EFF1EC;border-radius:12px"><div style="min-width:0"><b>'+this._esc(f.label)+'</b><div style="font-size:12px;color:#8B98A2;margin-top:3px">'+this._esc(f.goal)+'</div></div><div style="font-size:13px;font-weight:900;color:#1E5081">'+this._esc(String(f.score))+'/100</div></div>';
    });
    var recRows=e.recommendations.map((r)=>{
      var tone=r.priority==="Haute"?"#C15F4C":(r.priority==="Moyenne"?"#B98A2E":"#3F9A5A");
      return '<div style="padding:11px 12px;background:#fff;border:1px solid #E7E9E4;border-radius:13px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:900;color:'+tone+';background:#F7F8F5;border-radius:99px;padding:4px 8px">'+this._esc(r.priority)+'</span><b>'+this._esc(r.title)+'</b></div><div style="font-size:12.5px;color:#5A6B78;line-height:1.4;margin-top:5px">'+this._esc(r.detail)+'</div></div>';
    });
    return '<section style="background:#F7F8F5;border:1px solid #EFF1EC;border-radius:18px;padding:14px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px"><div><h3 style="margin:0;font-size:16px;font-weight:900">Évaluation automatique du projet</h3><p style="margin:4px 0 0;color:#8B98A2;font-size:12.5px;line-height:1.4">Analyse privée de l’usage et des mises à jour prioritaires. Aucun montant, email, nom de banque, créancier ou justificatif n’est enregistré ici.</p></div><span style="font-size:12px;font-weight:900;color:#1E5081;background:#EAF1F8;border-radius:99px;padding:6px 10px">'+this._esc(e.eventCount+" signaux")+'</span></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:12px">'+featureRows.join("")+'</div><div style="display:flex;flex-direction:column;gap:8px">'+recRows.join("")+'</div></section>';
  }
  _todayShort(){ var d=new Date(); return d.getDate()+" "+this._moisFr[d.getMonth()]; }
  _todayFull(){ var d=new Date(); return d.getDate()+" "+this._moisFr[d.getMonth()]+" "+d.getFullYear(); }
  _thisMonth(){ return this._moisLong[new Date().getMonth()]; }
  _iconForType(t){ var m={"Argent liquide":"cash","Banque":"bank","Portefeuille en ligne":"card","Transfert":"card","Mobile":"phone"}; return m[t]||"wallet"; }

  /* ---------- Persistence (v2) ---------- */
  _persist(){
    var snapshot=null;
    try{
      snapshot=this._snapshotFromState();
      if(!(this._cloudEnabled() && this._cloudSession)){
        localStorage.setItem(this._KEY, JSON.stringify(snapshot));
      }
    }catch(e){}
    try{ this._cloudPersistSnapshot(snapshot); }catch(e){ this._cloudHandleError("persist", e); }
  }
  _loadV2(){
    try{ var r=localStorage.getItem(this._KEY); if(r){ var d=JSON.parse(r); if(d && d.v===2) return d; } }catch(e){}
    return null;
  }

  /* ---------- Migration v1 -> v2 ----------
     v1 stored floats treated as USD amounts by fmt().
     Back up v1, then convert once to USD cents (exp 2). */
  _toMinorFromFloat(v, exp){
    var n=Number(v)||0;
    return Math.round(n*this._pow(exp));   // one-time migration conversion
  }
  _migrateV1(){
    var raw=null;
    try{ raw=localStorage.getItem(this._KEY_V1); }catch(e){ return null; }
    if(!raw) return null;
    var v1;
    try{ v1=JSON.parse(raw); }catch(e){ return null; }
    if(!v1 || !v1.accounts) return null;

    try{ if(!localStorage.getItem(this._KEY_BK)) localStorage.setItem(this._KEY_BK, raw); }catch(e){}

    var self=this, CUR="USD", E=2;
    var m=function(v){ return self._toMinorFromFloat(v,E); };
    var v2={
      v:2, currency:CUR,
      accounts:(v1.accounts||[]).map(function(a){ return Object.assign({},a,{balance_minor:m(a.bal),currency:CUR,bal:undefined}); }),
      incomes:(v1.incomes||[]).map(function(i){ return Object.assign({},i,{amount_minor:m(i.amount),currency:CUR,amount:undefined}); }),
      expenses:(v1.expenses||[]).map(function(e){ return Object.assign({},e,{amount_minor:m(e.amount),currency:CUR,amount:undefined}); }),
      savings:(v1.savings||[]).map(function(g){ return Object.assign({},g,{target_amount_minor:m(g.target),current_amount_minor:m(g.saved),currency:CUR,target:undefined,saved:undefined}); }),
      pots:(v1.pots||[]).map(function(g){ return Object.assign({},g,{target_amount_minor:m(g.price),current_amount_minor:m(g.saved),currency:CUR,price:undefined,saved:undefined}); }),
      debts:(v1.debts||[]).map(function(d){ return Object.assign({},d,{total_amount_minor:m(d.total),paid_amount_minor:m(d.paid),currency:CUR,total:undefined,paid:undefined}); }),
      loans:(v1.loans||[]).map(function(l){ return Object.assign({},l,{amount_lent_minor:m(l.lent),amount_repaid_minor:m(l.repaid),currency:CUR,lent:undefined,repaid:undefined}); })
    };
    try{ localStorage.setItem(this._KEY, JSON.stringify(v2)); }catch(e){}
    this._migrated=true;
    return v2;
  }

  _normalizeIds(){
    var self=this;
    this._dataKeys().forEach(function(k){
      (self.state[k]||[]).forEach(function(o){ if(o && !o.id) o.id=self._uid(); });
    });
  }

  componentDidMount(){
    window.__mc=this;
    window.__mcMoneyTests=()=>this._moneyTests();
    window.__mcProductEvaluation=()=>this._productEvaluation();
    this._watchViewportMode();
    this._scheduleCalendarRefresh();
    this._openIDB();
    var data=this._loadV2();
    if(!data) data=this._migrateV1();
    var self=this;
    if(this._cloudEnabled()){
      this.setState({page:"login"});
    }
    if(data){
      var patch={};
      ["currency"].concat(this._dataKeys()).forEach(function(k){ if(data[k]!=null) patch[k]=data[k]; });
      this.setState(patch, function(){
        self._normalizeIds(); self._wireRows(); self._wireLogin(); self._fitLoginScreen(); self._wirePlanningUi(); self._wireDebtDecisionUi();
        if(self._migrated){ self._migrated=false; self.showToast("ok","Données migrées vers le modèle monétaire entier."); }
      });
    } else {
      this._normalizeIds();
      this._wireRows();
      this._wireLogin();
      this._fitLoginScreen();
      this._wirePlanningUi();
      this._wireDebtDecisionUi();
    }
    this._maybeInitCloud();
  }
  componentDidUpdate(){ this._wireRows(); this._wireLogin(); this._fitLoginScreen(); this._wirePlanningUi(); this._wireDebtDecisionUi(); }
  componentWillUnmount(){
    try{
      clearTimeout(this._calendarTimer);
      if(this._viewportHandler && typeof window!=="undefined"){
        window.removeEventListener("resize", this._viewportHandler);
        window.removeEventListener("orientationchange", this._viewportHandler);
        if(window.visualViewport?.removeEventListener){
          window.visualViewport.removeEventListener("resize", this._viewportHandler);
          window.visualViewport.removeEventListener("scroll", this._viewportHandler);
        }
      }
    }catch(e){}
  }
  _scheduleCalendarRefresh(){
    clearTimeout(this._calendarTimer);
    const now=new Date(), next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);
    this._calendarTimer=setTimeout(()=>{ this.setState({calendarTick:Date.now()}); this._scheduleCalendarRefresh(); },Math.max(1000,next.getTime()-now.getTime()));
  }
  _watchViewportMode(){
    try{
      if(typeof window==="undefined" || !window.addEventListener) return;
      var self=this, last=this.mode;
      this._viewportHandler=function(){
        var next=self.mode;
        if(next!==last){
          last=next;
          self.setState({viewportMode:next, menuOpen:false});
        }
        setTimeout(function(){ self._fitLoginScreen(); },0);
      };
      window.addEventListener("resize", this._viewportHandler, {passive:true});
      window.addEventListener("orientationchange", this._viewportHandler, {passive:true});
      if(window.visualViewport?.addEventListener){
        window.visualViewport.addEventListener("resize", this._viewportHandler, {passive:true});
        window.visualViewport.addEventListener("scroll", this._viewportHandler, {passive:true});
      }
    }catch(e){}
  }

  /* ---------- IndexedDB: private attachments ---------- */
  _openIDB(){
    try{
      var self=this, rq=indexedDB.open("moncoffre-files",1);
      rq.onupgradeneeded=function(){ var db=rq.result; var st=db.createObjectStore("files",{keyPath:"id"}); st.createIndex("parent","parent"); };
      rq.onsuccess=function(){ self._idb=rq.result; };
    }catch(e){}
  }
  _idbAdd(f){ var self=this; return new Promise(function(res,rej){ var tx=self._idb.transaction("files","readwrite"); tx.objectStore("files").put(f); tx.oncomplete=res; tx.onerror=function(){rej(tx.error);}; }); }
  _idbByParent(p){ var self=this; return new Promise(function(res){ if(!self._idb) return res([]); var tx=self._idb.transaction("files","readonly"); var r=tx.objectStore("files").index("parent").getAll(p); r.onsuccess=function(){res(r.result||[]);}; r.onerror=function(){res([]);}; }); }
  _idbDel(id){ var self=this; return new Promise(function(res){ var tx=self._idb.transaction("files","readwrite"); tx.objectStore("files").delete(id); tx.oncomplete=res; tx.onerror=res; }); }
  _readFile(f){ return new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){res(r.result);}; r.onerror=rej; r.readAsDataURL(f); }); }
  _saveFiles(parent, fileList){
    if(this._cloudEnabled() && this._cloudSession) return this._cloudSaveFiles(parent, fileList);
    var self=this;
    return (async function(){
      var n=0;
      for(var i=0;i<fileList.length;i++){
        var f=fileList[i];
        if(self.MC_OK_TYPES.indexOf(f.type)<0){ self.showToast("warn","Type refusé : "+f.name); continue; }
        if(f.size>self.MC_MAX){ self.showToast("warn","Fichier trop lourd (5 Mo max) : "+f.name); continue; }
        var data=await self._readFile(f);
        await self._idbAdd({id:self._uid(), parent:parent, name:f.name, mime:f.type, data:data, at:new Date().toISOString()});
        n++;
      }
      return n;
    })();
  }
  _filesByParent(parent){
    if(this._cloudEnabled() && this._cloudSession) return this._cloudFilesByParent(parent);
    return this._idbByParent(parent);
  }
  _deleteFile(f){
    if(f && f.cloud) return this._cloudDeleteFile(f);
    return this._idbDel(f.id);
  }
  _openFile(f){
    if(f && f.url){ window.open(f.url,"_blank"); return; }
    try{
      var b=atob(f.data.split(",")[1]); var arr=new Uint8Array(b.length);
      for(var i=0;i<b.length;i++) arr[i]=b.charCodeAt(i);
      var url=URL.createObjectURL(new Blob([arr],{type:f.mime}));
      window.open(url,"_blank");
    }catch(e){ this.showToast("warn","Impossible d'ouvrir ce fichier."); }
  }

  /* ---------- Financial plan, mandatory onboarding, projections ---------- */
  _defaultFinancialPlan(){
    return {
      version:1,
      onboarding:{completed:false,completed_at:null,step:0},
      profile:{display_name:"",main_currency:"USD",country:"US",pay_frequency:"Mensuel"},
      raw:{income:"",accounts:"",fixedExpenses:"",debts:"",goals:"",plannedPurchases:"",riskAreas:"",dangerousPayday:""},
      structured:{income:[],accounts:[],fixedExpenses:[],debts:[],goals:[],plannedPurchases:[]},
      lifestyle:{old_income_minor:0,new_income_minor:0,change_date:"",baseline_expense_minor:0,threshold_pct:15,excluded:"Logement, dettes, urgence médicale"},
      snowball:{monthly_budget_minor:0,strategy:"snowball"},
      funding:{mode:"sequential",emergency_first:true},
      monthlyReview:{enabled:true,detail:"detailed",day:"end"},
      realEstate:{status:"not_yet",target_price_minor:0,rate_bps:700,term_months:360,linked_goal_name:"Apport immobilier",investor_mode:false,estimated_rent_minor:0},
      simulator:{extra_income_minor:0,freed_debt_minor:0,rate_bps:650,extra_down_payment_minor:0},
      plannedPurchase:{tax_pct:8.25,finance_low_pct:8,finance_high_pct:17}
    };
  }
  _mergePlan(plan){
    var base=this._defaultFinancialPlan();
    function merge(a,b){
      if(!b || typeof b!=="object" || Array.isArray(b)) return a;
      Object.keys(b).forEach(function(k){
        if(b[k] && typeof b[k]==="object" && !Array.isArray(b[k])){
          a[k]=merge(Object.assign({},a[k]||{}),b[k]);
        } else {
          a[k]=b[k];
        }
      });
      return a;
    }
    return merge(base, plan||{});
  }
  _plan(){ return this._mergePlan(this.state.financialPlan); }
  _setPlan(plan, cb){
    var self=this, next=this._mergePlan(plan);
    this.setState({financialPlan:next}, function(){ self._persist(); if(cb) cb(); });
  }
  _lines(v){
    return String(v||"").split(/\r?\n/).map(function(x){ return x.trim(); }).filter(function(x){ return x && !/^aucun(e)?$/i.test(x); });
  }
  _parts(line){ return String(line||"").split("|").map(function(x){ return x.trim(); }); }
  _moneyInput(v, cur){ return this.mParse(String(v||"").replace(/\$/g,""), cur||this.state.currency); }
  _moneyFromText(v, cur){
    var m=String(v||"").replace(/\$/g,"").match(/-?\d+(?:[.,]\d+)?/);
    return this._moneyInput(m?m[0]:"", cur||this.state.currency);
  }
  _numInput(v){ return Number(String(v||"").replace(",",".").replace(/[^0-9.-]/g,""))||0; }
  _obDayOptions(variableFirst){
    var nums=[]; for(var i=1;i<=31;i++) nums.push(String(i));
    var weekdays=["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
    return variableFirst ? ["Variable"].concat(nums,weekdays) : nums.concat(["Variable"],weekdays);
  }
  _obClosed(v, allowed, fallback){
    var s=String(v||"").trim().toLowerCase();
    for(var i=0;i<allowed.length;i++){ if(String(allowed[i]).toLowerCase()===s) return allowed[i]; }
    return fallback||allowed[0];
  }
  _obRole(v){
    var s=String(v||"").toLowerCase();
    if(/coussin|urgence|securite|sécurité/.test(s)) return "Coussin de sécurité";
    if(/epargne|épargne|saving/.test(s)) return "Épargne";
    if(/depense|dépense|spend|courant/.test(s)) return "Dépenses";
    return this._obClosed(v,["Dépenses","Coussin de sécurité","Épargne","Autre"],"Autre");
  }
  _obFreq(v){
    var s=String(v||"").toLowerCase();
    if(/bi|deux/.test(s)) return "Bi-hebdomadaire";
    if(/hebdo|week|semaine/.test(s)) return "Hebdomadaire";
    if(/variable|irr/.test(s)) return "Variable";
    return this._obClosed(v,["Hebdomadaire","Bi-hebdomadaire","Mensuel","Variable"],"Mensuel");
  }
  _obIncomeType(v){
    var s=String(v||"").toLowerCase();
    return /variable|var/.test(s) ? "Variable" : "Fixe";
  }
  _obCategory(v){
    var s=String(v||"").toLowerCase();
    if(/loyer|rent|logement|mortgage/.test(s)) return "Logement";
    if(/famille|family|taptap|transfert/.test(s)) return "Famille";
    if(/abo|subscription|apple|netflix|phone|téléphone/.test(s)) return "Abonnement";
    if(/transport|essence|carburant|uber|bus/.test(s)) return "Transport";
    return this._obClosed(v,["Logement","Famille","Abonnement","Transport","Autre"],"Autre");
  }
  _obPriority(v){ return this._obClosed(v,["Haute","Moyenne","Basse"],"Moyenne"); }
  _obDefaultRow(kind){
    var m={
      income:{source:"",amount:"",frequency:"Mensuel",payday:"Variable",income_type:"Fixe"},
      accounts:{name:"",balance:"",role:"Dépenses"},
      fixedExpenses:{name:"",amount:"",day:"1",category:"Logement"},
      debts:{name:"",balance:"",minimum:"",apr:"0",due:"Variable"},
      goals:{name:"",target:"",date:"",priority:"Moyenne"},
      plannedPurchases:{name:"",price:"",schedule:"",priority:"Moyenne",image_url:""}
    };
    return Object.assign({},m[kind]||{});
  }
  _parseObRows(kind, raw){
    var self=this;
    return this._lines(raw).map(function(line){
      var a=self._parts(line), row=self._obDefaultRow(kind);
      if(kind==="income") return {source:a[0]||"",amount:a[1]||"",frequency:self._obFreq(a[2]),payday:a[3]||"Variable",income_type:self._obIncomeType(a[4])};
      if(kind==="accounts") return {name:a[0]||"",balance:a[1]||"",role:self._obRole(a[2])};
      if(kind==="fixedExpenses") return {name:a[0]||"",amount:a[1]||"",day:a[2]||"1",category:self._obCategory(a[3])};
      if(kind==="debts") return {name:a[0]||"",balance:a[1]||"",minimum:a[2]||"",apr:a[3]||"0",due:a[4]||"Variable"};
      if(kind==="goals") return {name:a[0]||"",target:a[1]||"",date:a[2]||"",priority:self._obPriority(a[3])};
      if(kind==="plannedPurchases") return {name:a[0]||"",price:a[1]||"",schedule:a[2]||"",priority:self._obPriority(a[3]),image_url:self._safeImageUrl(a[4])};
      return row;
    });
  }
  _obRows(kind, plan, keepDrafts){
    var self=this, p=this._mergePlan(plan||this._plan()), s=(p.structured&&p.structured[kind])||[];
    function clean(x){
      var row=Object.assign(self._obDefaultRow(kind),x||{});
      if(kind==="accounts") row.role=self._obRole(row.role);
      if(kind==="income"){ row.frequency=self._obFreq(row.frequency); row.income_type=self._obIncomeType(row.income_type); row.payday=row.payday||"Variable"; }
      if(kind==="fixedExpenses"){ row.day=row.day||"1"; row.category=self._obCategory(row.category); }
      if(kind==="debts") row.due=row.due||"Variable";
      if(kind==="goals") row.priority=self._obPriority(row.priority);
      if(kind==="plannedPurchases"){ row.priority=self._obPriority(row.priority); row.image_url=self._safeImageUrl(row.image_url); }
      return row;
    }
    if(Array.isArray(s) && s.length){
      var rows=s.map(clean);
      return keepDrafts?rows:rows.filter(function(row){ return self._obRowHasMeaning(kind,row); });
    }
    return this._parseObRows(kind,(p.raw&&p.raw[kind])||"");
  }
  _obSerialize(kind, rows){
    rows=rows||[];
    return rows.map(function(r){
      if(kind==="income") return [r.source,r.amount,r.frequency,r.payday,r.income_type].join(" | ");
      if(kind==="accounts") return [r.name,r.balance,r.role].join(" | ");
      if(kind==="fixedExpenses") return [r.name,r.amount,r.day,r.category].join(" | ");
      if(kind==="debts") return [r.name,r.balance,r.minimum,r.apr,r.due].join(" | ");
      if(kind==="goals") return [r.name,r.target,r.date,r.priority].join(" | ");
      if(kind==="plannedPurchases") return [r.name,r.price,r.schedule,r.priority,r.image_url||""].join(" | ");
      return "";
    }).filter(Boolean).join("\n");
  }
  _obFields(kind){
    var day=this._obDayOptions(true), fixedDay=this._obDayOptions(false);
    var fields={
      income:[["source","Nom de la source","text","InvenTech"],["amount","Montant","money","3200"],["frequency","Fréquence","select",["Hebdomadaire","Bi-hebdomadaire","Mensuel","Variable"]],["payday","Jour de paie","select",day],["income_type","Type","select",["Fixe","Variable"]]],
      accounts:[["name","Nom de la banque","text","Amegy"],["balance","Solde actuel","money","1200"],["role","Rôle","select",["Dépenses","Coussin de sécurité","Épargne","Autre"]]],
      fixedExpenses:[["name","Nom","text","Loyer"],["amount","Montant","money","792,35"],["day","Jour du mois","select",fixedDay],["category","Catégorie","select",["Logement","Famille","Abonnement","Transport","Autre"]]],
      debts:[["name","À qui / pour quoi ?","text","Carte Capital One"],["balance","Montant restant","money","500"],["minimum","Minimum à payer","money","25"],["apr","Intérêt si connu","text","0"],["due","Jour limite","select",day]],
      goals:[["name","Objectif","text","Épargne décembre"],["target","Montant cible","money","10000"],["date","Date cible","text","2026-12-31"],["priority","Priorité","select",["Haute","Moyenne","Basse"]]],
      plannedPurchases:[["name","Objet","text","MacBook"],["price","Prix","money","900"],["schedule","Date ou contribution","text","2026-11-01 ou 75/semaine"],["priority","Priorité","select",["Haute","Moyenne","Basse"]],["image_url","Image optionnelle","text","https://..."]]
    };
    return fields[kind]||[];
  }
  _obMeaningfulKeys(kind){
    var keys={
      income:["source","amount"],
      accounts:["name","balance"],
      fixedExpenses:["name","amount"],
      debts:["name","balance","minimum"],
      goals:["name","target","date"],
      plannedPurchases:["name","price","schedule"]
    };
    return keys[kind]||null;
  }
  _obRowHasMeaning(kind,row){
    var keys=this._obMeaningfulKeys(kind)||Object.keys(row||{});
    return keys.some(function(k){ return String((row||{})[k]||"").trim()!==""; });
  }
  _obRepeatHtml(kind,label,rows,addLabel,hint){
    var fields=this._obFields(kind), data=(rows&&rows.length)?rows:[this._obDefaultRow(kind)], self=this;
    var html='<section data-ob-section="'+this._esc(kind)+'" style="border:1px solid #EFF1EC;background:#F7F8F5;border-radius:16px;padding:12px;margin-bottom:13px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px"><div><div style="font-size:12.5px;font-weight:900;color:#5A6B78">'+this._esc(label)+'</div><div style="font-size:11.5px;color:#8B98A2;margin-top:2px">'+this._esc(hint||"Ajoute une ligne, ou passe cette étape si elle ne te concerne pas.")+'</div></div><button type="button" data-ob-action="add" data-ob-kind="'+this._esc(kind)+'" style="flex:none;padding:9px 11px;border-radius:11px;border:1px solid #DDE0DA;background:#fff;color:#1E5081;font-size:12.5px;font-weight:900;cursor:pointer">'+this._esc(addLabel||"+ Ajouter")+'</button></div><div style="display:flex;flex-direction:column;gap:10px">';
    data.forEach(function(row,i){
      html+='<div data-ob-row="'+i+'" style="background:#fff;border:1px solid #E7E9E4;border-radius:14px;padding:11px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(126px,1fr));gap:9px;align-items:end">';
      fields.forEach(function(f){
        var key=f[0], lab=f[1], type=f[2], val=row[key]||"", opts=f[3];
        html+='<label style="display:block"><span style="display:block;font-size:11.5px;font-weight:800;color:#5A6B78;margin-bottom:5px">'+self._esc(lab)+'</span>';
        if(type==="select"){
          html+='<select data-ob-kind="'+self._esc(kind)+'" data-ob-index="'+i+'" data-ob-key="'+self._esc(key)+'" style="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:11px;padding:10px;font-size:12.5px;font-weight:800;outline:none;color:#17293C">';
          (opts||[]).forEach(function(o){ html+='<option value="'+self._esc(o)+'" '+(String(val)===String(o)?"selected":"")+'>'+self._esc(o)+'</option>'; });
          html+='</select>';
        } else {
          html+='<input data-ob-kind="'+self._esc(kind)+'" data-ob-index="'+i+'" data-ob-key="'+self._esc(key)+'" '+(type==="money"?'inputmode="decimal"':'')+' value="'+self._esc(val)+'" placeholder="'+self._esc(opts||"")+'" style="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:11px;padding:10px;font-size:12.5px;font-weight:700;outline:none;color:#17293C">';
        }
        html+='</label>';
      });
      html+='</div><button type="button" data-ob-action="remove" data-ob-kind="'+self._esc(kind)+'" data-ob-index="'+i+'" style="margin-top:9px;padding:8px 10px;border-radius:10px;border:1px solid #F0D7D2;background:#FFF8F6;color:#C15F4C;font-size:12px;font-weight:900;cursor:pointer">× Supprimer</button></div>';
    });
    return html+'</div></section>';
  }
  _collectObRows(kind, keepDrafts){
    var self=this, nodes=document.querySelectorAll('[data-ob-kind="'+kind+'"][data-ob-key]'), by={};
    Array.prototype.forEach.call(nodes,function(el){
      var i=String(el.getAttribute("data-ob-index")||"0"), k=el.getAttribute("data-ob-key");
      by[i]=by[i]||{}; by[i][k]=String(el.value||"").trim();
    });
    return Object.keys(by).sort(function(a,b){return Number(a)-Number(b);}).map(function(i){ return by[i]; }).filter(function(r){
      return keepDrafts||self._obRowHasMeaning(kind,r);
    });
  }
  _obRowsError(kind, rows, allowEmpty){
    rows=rows||[];
    if(!rows.length) return allowEmpty?"":"Ajoute au moins une ligne, ou clique Passer cette étape.";
    for(var i=0;i<rows.length;i++){
      var r=rows[i], n=i+1;
      if(kind==="accounts"){
        if(!r.name) return "Compte "+n+" : indique le nom de la banque.";
        if(String(r.balance||"").trim()==="") return "Compte "+n+" : indique le solde, même 0.";
        r.role=this._obRole(r.role);
      } else if(kind==="income"){
        if(!r.source) return "Revenu "+n+" : indique la source.";
        if(this._moneyInput(r.amount,this.state.currency)<=0) return "Revenu "+n+" : indique un montant.";
        r.frequency=this._obFreq(r.frequency); r.income_type=this._obIncomeType(r.income_type); r.payday=r.payday||"Variable";
      } else if(kind==="fixedExpenses"){
        if(!r.name) return "Dépense "+n+" : indique le nom.";
        if(this._moneyInput(r.amount,this.state.currency)<=0) return "Dépense "+n+" : indique un montant.";
        r.day=r.day||"1"; r.category=this._obCategory(r.category);
      } else if(kind==="debts"){
        if(!r.name) return "Dette "+n+" : indique à qui tu dois payer, ou pourquoi.";
        if(this._moneyInput(r.balance,this.state.currency)<=0) return "Dette "+n+" : indique le montant qu'il reste à payer.";
        if(String(r.minimum||"").trim()==="") return "Dette "+n+" : indique le minimum à payer chaque mois, même 0.";
        r.due=r.due||"Variable";
      } else if(kind==="goals"){
        if(!r.name) return "Objectif "+n+" : indique le nom.";
        if(this._moneyInput(r.target,this.state.currency)<=0) return "Objectif "+n+" : indique le montant cible.";
        r.priority=this._obPriority(r.priority);
      } else if(kind==="plannedPurchases"){
        if(!r.name) return "Achat "+n+" : indique l'objet.";
        if(this._moneyInput(r.price,this.state.currency)<=0) return "Achat "+n+" : indique le prix.";
        r.priority=this._obPriority(r.priority); r.image_url=this._safeImageUrl(r.image_url);
      }
    }
    return "";
  }
  _hasMeaningfulData(){
    var s=this.state;
    return !!((s.accounts&&s.accounts.length)||(s.incomes&&s.incomes.length)||(s.expenses&&s.expenses.length)||(s.debts&&s.debts.length)||(s.savings&&s.savings.length)||(s.pots&&s.pots.length));
  }
  _needsOnboarding(){
    if(!this._cloudEnabled() || !this._cloudUser) return false;
    var p=this._plan();
    return !(p.onboarding && p.onboarding.completed===true);
  }
  _monthlyIncomeMinor(){
    var self=this, p=this._plan(), n=0;
    (this.state.incomes||[]).forEach(function(i){
      if(!self._same(i)) return;
      var freq=String(i.freq||"Mensuel").toLowerCase(), amt=Math.trunc(Number(i.amount_minor)||0);
      if(freq.indexOf("hebdo")>=0) n+=Math.round(amt*52/12);
      else if(freq.indexOf("bi")>=0) n+=Math.round(amt*26/12);
      else if(freq.indexOf("ponct")>=0) n+=0;
      else n+=amt;
    });
    return n || Math.trunc(Number(p.lifestyle&&p.lifestyle.new_income_minor)||0) || 0;
  }
  _monthlyDebtMinor(){
    var self=this, total=0;
    (this.state.debts||[]).forEach(function(d){
      if(!self._same(d)) return;
      var remain=Math.max(0,(Number(d.total_amount_minor)||0)-(Number(d.paid_amount_minor)||0));
      if(remain<=0) return;
      total+=Math.trunc(Number(d.minimum_minor)||0);
    });
    if(total>0) return total;
    var p=this._plan();
    return Math.trunc(Number(p.snowball&&p.snowball.monthly_budget_minor)||0);
  }
  _monthlyExpenseBy(offset){
    const period=this._shiftPeriod(this._currentPeriod(),offset);
    let sum=0;
    (this.state.expenses||[]).forEach((e)=>{ if(this._same(e) && this._recordInPeriod(e,period)) sum+=Math.trunc(Number(e.amount_minor)||0); });
    return sum;
  }
  _lifestyleSignal(){
    var p=this._plan(), base=Math.trunc(Number(p.lifestyle.baseline_expense_minor)||0), cur=this._monthlyExpenseBy(0);
    if(!cur) cur=this._monthlyExpenseBy(-1);
    var pct=base>0?Math.round((cur-base)/base*100):0;
    return {baseline:base,current:cur,pct:pct,alert:base>0 && pct>=Math.trunc(Number(p.lifestyle.threshold_pct)||15)};
  }
  _debtRemaining(d){
    const total=Math.max(0,Math.trunc(Number(d.total_amount_minor)||0));
    return Math.max(0,total-this._debtPaidMinor(total,d.paid_amount_minor));
  }
  _debtPaidMinor(total, paid){
    const safeTotal=Math.max(0,Math.trunc(Number(total)||0));
    return Math.max(0,Math.min(safeTotal,Math.trunc(Number(paid)||0)));
  }
  _debtDueTime(d){
    const iso=this._isoDateMaybe(d && d.due);
    if(!iso) return Number.MAX_SAFE_INTEGER;
    const t=new Date(iso+"T00:00:00").getTime();
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
  }
  _debtDecisionRows(){
    return (this.state.debts||[]).filter((d)=>this._same(d) && this._debtRemaining(d)>0).map((d)=>{
      const remain=this._debtRemaining(d);
      const minimum=Math.max(0, Math.trunc(Number(d.minimum_minor)||0));
      const apr=Math.max(0, Math.trunc(Number(d.apr_bps)||0));
      const status=String(d.status||"");
      return Object.assign({},d,{remain:remain,minimum_minor:Math.min(minimum,remain),apr_bps:apr,due_time:this._debtDueTime(d),overdue:status.toLowerCase().includes("retard")});
    });
  }
  _debtMonthlyBudget(rows){
    const totalMinimum=(rows||[]).reduce((sum,d)=>sum+(Math.trunc(Number(d.minimum_minor)||0)),0);
    const planBudget=Math.max(0, Math.trunc(Number(this._plan().snowball&&this._plan().snowball.monthly_budget_minor)||0));
    return Math.max(planBudget,totalMinimum);
  }
  _debtStrategyLabel(strategy){
    const labels={urgent:"Stop retard",avalanche:"Coût le plus cher",snowball:"Boule de neige"};
    return labels[strategy]||labels.snowball;
  }
  _debtSortRows(rows, strategy){
    const copy=(rows||[]).slice();
    if(strategy==="urgent"){
      copy.sort((a,b)=>(a.overdue===b.overdue?0:(a.overdue?-1:1)) || (a.due_time-b.due_time) || (b.apr_bps-a.apr_bps) || (a.remain-b.remain));
      return copy;
    }
    if(strategy==="avalanche"){
      copy.sort((a,b)=>(b.apr_bps-a.apr_bps) || (a.remain-b.remain));
      return copy;
    }
    copy.sort((a,b)=>(a.remain-b.remain) || (b.apr_bps-a.apr_bps));
    return copy;
  }
  _debtPlanForStrategy(rows, monthlyBudget, strategy){
    const sorted=this._debtSortRows(rows, strategy);
    const totalMinimum=sorted.reduce((sum,d)=>sum+d.minimum_minor,0);
    const extra=Math.max(0, Math.trunc(Number(monthlyBudget)||0)-totalMinimum);
    let freedMinimum=0;
    let cursor=new Date();
    return sorted.map((d,index)=>{
      const fallback=index===0 && !totalMinimum ? Math.trunc(Number(monthlyBudget)||0) : 0;
      const monthly=d.minimum_minor+extra+freedMinimum+fallback;
      const months=monthly>0 ? Math.max(1, Math.ceil(d.remain/monthly)) : 0;
      const done=months>0 ? new Date(cursor.getFullYear(), cursor.getMonth()+months, 1) : null;
      if(done) cursor=done;
      freedMinimum+=d.minimum_minor;
      return Object.assign({},d,{rank:index+1,monthly:monthly,months:months,done:done});
    });
  }
  _debtChooseStrategy(rows){
    if(!(rows&&rows.length)) return "snowball";
    if(rows.some((d)=>d.overdue)) return "urgent";
    const highest=rows.slice().sort((a,b)=>b.apr_bps-a.apr_bps)[0];
    const smallest=rows.slice().sort((a,b)=>a.remain-b.remain)[0];
    if(highest && smallest && highest.apr_bps>=1800 && (highest.apr_bps-(smallest.apr_bps||0))>=600) return "avalanche";
    return "snowball";
  }
  _debtWhy(strategy, target){
    if(!target) return "Ajoute tes dettes pour que Mon Coffre puisse te guider.";
    if(strategy==="urgent") return "Cette dette est en retard ou arrive en premier. On évite les frais et la pression avant tout.";
    if(strategy==="avalanche") return "Cette dette coûte le plus cher en intérêts. La réduire bouche la plus grosse fuite d'argent.";
    return "Cette dette est la plus petite à terminer. La solder libère vite un paiement mensuel pour attaquer la suivante.";
  }
  _debtDecisionPlan(strategyOverride){
    const rows=this._debtDecisionRows();
    const cur=this.state.currency;
    const totalRemain=rows.reduce((sum,d)=>sum+d.remain,0);
    const totalMinimum=rows.reduce((sum,d)=>sum+d.minimum_minor,0);
    const monthlyBudget=this._debtMonthlyBudget(rows);
    const extra=Math.max(0, monthlyBudget-totalMinimum);
    const strategy=strategyOverride||this._debtChooseStrategy(rows);
    const sequence=this._debtPlanForStrategy(rows, monthlyBudget, strategy);
    const target=sequence[0]||null;
    const lastDone=sequence.filter((d)=>!!d.done).slice(-1)[0]||null;
    const byId={};
    sequence.forEach((d)=>{ if(d.id) byId[d.id]=d; });
    if(!rows.length){
      return {ok:false,byId:byId,sequence:[],strategy:strategy,strategyLabel:this._debtStrategyLabel(strategy),totalRemain:0,totalMinimum:0,monthlyBudget:0,extra:0,coachLine:"Ajoute une dette pour recevoir une stratégie de remboursement."};
    }
    const targetName=target.name||target.creditor||"cette dette";
    const payLine=monthlyBudget<=0
      ? "Commence par définir combien tu peux payer par mois, puis attaque "+targetName+" en premier."
      : (extra>0 ? "Paie les minimums ailleurs, puis mets "+this.mFmt(extra,cur)+" de surplus sur "+targetName+"." : "Paie chaque minimum à temps. Dès que tu trouves un surplus, mets-le sur "+targetName+".");
    const doneText=target&&target.done ? target.done.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}) : "budget à définir";
    const debtFreeText=lastDone&&lastDone.done ? lastDone.done.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}) : "budget à définir";
    return {
      ok:true,
      byId:byId,
      sequence:sequence,
      strategy:strategy,
      strategyLabel:this._debtStrategyLabel(strategy),
      totalRemain:totalRemain,
      totalMinimum:totalMinimum,
      monthlyBudget:monthlyBudget,
      extra:extra,
      target:target,
      targetName:targetName,
      targetPayStr:target?this.mFmt(target.monthly,cur):this.mFmt(0,cur),
      targetDoneStr:doneText,
      debtFreeStr:debtFreeText,
      headline:"Attaque d'abord "+targetName,
      why:this._debtWhy(strategy,target),
      action:payLine,
      coachLine:"Priorité dette : "+targetName+" avec la stratégie "+this._debtStrategyLabel(strategy).toLowerCase()+"."
    };
  }
  _snowballPlan(){
    const rows=this._debtDecisionRows();
    return this._debtPlanForStrategy(rows, this._debtMonthlyBudget(rows), "snowball");
  }
  _sequentialFunding(){
    var self=this, goals=[];
    (this.state.savings||[]).forEach(function(g){ if(self._same(g)) goals.push(Object.assign({kind:"saving"},g)); });
    (this.state.pots||[]).forEach(function(g){ if(self._same(g)) goals.push(Object.assign({kind:"purchase"},g)); });
    goals=goals.filter(function(g){ return (Number(g.target_amount_minor)||0)>(Number(g.current_amount_minor)||0); });
    goals.sort(function(a,b){
      var aEmergency=/urgence|coussin/i.test(a.name||"") ? -10 : 0;
      var bEmergency=/urgence|coussin/i.test(b.name||"") ? -10 : 0;
      var pr={"Haute":1,"Moyenne":2,"Basse":3};
      return (aEmergency+(pr[a.priority]||2))-(bEmergency+(pr[b.priority]||2));
    });
    return {active:goals[0]||null,next:goals[1]||null,goals:goals};
  }
  _plannedPurchaseViews(){
    var self=this, p=this._plan(), today=new Date();
    return (this.state.pots||[]).filter(function(g){ return self._same(g) && (g.goal_type==="planned_purchase" || g.planned===true || g.kind==="planned_purchase"); }).map(function(g){
      var remaining=Math.max(0,(Number(g.target_amount_minor)||0)-(Number(g.current_amount_minor)||0));
      var weekly=Math.trunc(Number(g.weekly_minor)||0);
      var targetIso=self._isoDateMaybe(g.target_iso||g.date);
      var targetDate=targetIso?new Date(targetIso+"T00:00:00"):null;
      if(!weekly && targetDate){
        var weeks=Math.max(1,Math.ceil((targetDate-today)/(7*24*3600*1000)));
        weekly=Math.ceil(remaining/weeks);
      }
      var eta=targetDate;
      if(weekly>0 && !targetDate) eta=new Date(today.getFullYear(),today.getMonth(),today.getDate()+Math.ceil(remaining/weekly)*7);
      var low=Math.round((Number(g.target_amount_minor)||0)*(1+(p.plannedPurchase.finance_low_pct||8)/100));
      var high=Math.round((Number(g.target_amount_minor)||0)*(1+(p.plannedPurchase.finance_high_pct||17)/100));
      return {goal:g,remaining:remaining,weekly:weekly,eta:eta,financeLow:low,financeHigh:high,savedLow:Math.max(0,low-(Number(g.target_amount_minor)||0)),savedHigh:Math.max(0,high-(Number(g.target_amount_minor)||0))};
    });
  }
  _planWithDebtMeta(plan, debt, cur){
    const next=this._mergePlan(plan);
    const rows=((next.structured&&next.structured.debts)||[]).slice();
    const name=debt.name||debt.creditor||"Dette";
    const row={name:name,balance:this._plain(debt.total_amount_minor||0,cur),minimum:this._plain(debt.minimum_minor||0,cur),apr:String((Math.trunc(Number(debt.apr_bps)||0))/100).replace(".",","),due:debt.due||"Variable"};
    const key=String(name).toLowerCase();
    const index=rows.findIndex((r)=>String(r.name||"").toLowerCase()===key);
    if(index>=0) rows[index]=Object.assign({},rows[index],row);
    else rows.push(row);
    next.structured=next.structured||{};
    next.raw=next.raw||{};
    next.structured.debts=rows;
    next.raw.debts=this._obSerialize("debts",rows);
    return next;
  }
  _monthlyReview(){
    const cur=this.state.currency, period=this._currentPeriod(), prev=this._shiftPeriod(period,-1), month=this._periodLabel(period);
    const sum=(list,field,p)=>(list||[]).reduce((total,record)=>total+(this._same(record)&&(!p||this._recordInPeriod(record,p))?Math.trunc(Number(record[field])||0):0),0);
    const income=sum(this.state.incomes,"amount_minor",period), exp=sum(this.state.expenses,"amount_minor",period), prevExp=sum(this.state.expenses,"amount_minor",prev);
    const bySource={}, byCat={};
    (this.state.incomes||[]).forEach((i)=>{ if(this._same(i)&&this._recordInPeriod(i,period)) bySource[i.source||"Autre"]=(bySource[i.source||"Autre"]||0)+(Number(i.amount_minor)||0); });
    (this.state.expenses||[]).forEach((e)=>{ if(this._same(e)&&this._recordInPeriod(e,period)) byCat[e.cat||"Divers"]=(byCat[e.cat||"Divers"]||0)+(Number(e.amount_minor)||0); });
    return {month:month,income:income,expenses:exp,previousExpenses:prevExp,delta:exp-prevExp,bySource:bySource,byCat:byCat,currency:cur};
  }
  _mortgagePayment(principal, annualRateBps, months){
    var rate=(Number(annualRateBps)||0)/10000/12;
    if(principal<=0) return 0;
    if(rate<=0) return Math.round(principal/months);
    return Math.round(principal*rate*Math.pow(1+rate,months)/(Math.pow(1+rate,months)-1));
  }
  _mortgagePrincipal(payment, annualRateBps, months){
    var rate=(Number(annualRateBps)||0)/10000/12;
    if(payment<=0) return 0;
    if(rate<=0) return Math.round(payment*months);
    return Math.round(payment*(Math.pow(1+rate,months)-1)/(rate*Math.pow(1+rate,months)));
  }
  _realEstateProjection(){
    var p=this._plan(), re=p.realEstate||{}, sim=p.simulator||{}, monthlyIncome=this._monthlyIncomeMinor()+Math.trunc(Number(sim.extra_income_minor)||0);
    if(re.investor_mode) monthlyIncome+=Math.round((Number(re.estimated_rent_minor)||0)*0.75);
    var debts=Math.max(0,this._monthlyDebtMinor()-Math.trunc(Number(sim.freed_debt_minor)||0));
    var housing28=Math.round(monthlyIncome*0.28), housing36=Math.max(0,Math.round(monthlyIncome*0.36)-debts);
    var maxPayment=Math.min(housing28,housing36), down=this._downPaymentMinor()+Math.trunc(Number(sim.extra_down_payment_minor)||0);
    var rate=Number(sim.rate_bps||re.rate_bps||700), principal=this._mortgagePrincipal(maxPayment,rate,Number(re.term_months)||360);
    return {monthlyIncome:monthlyIncome,monthlyDebts:debts,maxPayment:maxPayment,maxPrice:principal+down,downPayment:down,rate_bps:rate};
  }
  _downPaymentMinor(){
    var p=this._plan(), name=(p.realEstate&&p.realEstate.linked_goal_name)||"Apport immobilier", found=null;
    (this.state.savings||[]).concat(this.state.pots||[]).forEach(function(g){ if(!found && String(g.name||"").toLowerCase()===String(name).toLowerCase()) found=g; });
    return found?Math.trunc(Number(found.current_amount_minor)||0):0;
  }

  /* ---------- Form engine

  /* ---------- Form engine: same styling as the expense modal ---------- */
  _mcModal(title, bodyEl, onSubmit, submitLabel){
    var scrim=document.createElement("div");
    scrim.style.cssText="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,35,50,.42);font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif";
    var card=document.createElement("div");
    card.style.cssText="position:relative;width:100%;max-width:468px;max-height:92vh;overflow-y:auto;background:#fff;border-radius:24px;box-shadow:0 22px 60px rgba(20,40,60,.22);padding:20px 20px 18px";
    var head=document.createElement("div");
    head.style.cssText="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px";
    head.innerHTML='<h3 style="font-size:17px;font-weight:800;margin:0;color:#17293C">'+this._esc(title)+'</h3>';
    var x=document.createElement("button");
    x.type="button"; x.textContent="✕";
    x.style.cssText="width:34px;height:34px;border-radius:11px;background:#F4F6F3;color:#5A6B78;font-size:17px;cursor:pointer;border:none;flex:none";
    head.appendChild(x);
    var err=document.createElement("div");
    err.style.cssText="color:#C15F4C;font-size:12.5px;font-weight:700;min-height:15px;margin-bottom:4px";
    var foot=document.createElement("div");
    foot.style.cssText="display:flex;gap:10px;margin-top:8px";
    var cancel=document.createElement("button");
    cancel.type="button"; cancel.textContent=onSubmit?"Annuler":"Fermer";
    cancel.style.cssText="flex:1;padding:14px;border-radius:13px;background:#fff;border:1px solid #DDE0DA;color:#5A6B78;font-size:14px;font-weight:700;cursor:pointer";
    foot.appendChild(cancel);
    var ok=null;
    if(onSubmit){
      ok=document.createElement("button");
      ok.type="button"; ok.textContent=submitLabel||"Enregistrer";
      ok.style.cssText="flex:2;padding:14px;border-radius:13px;background:linear-gradient(160deg,#1E5081,#17405F);color:#fff;font-size:14px;font-weight:700;cursor:pointer;border:none;box-shadow:0 8px 18px rgba(30,80,129,.22)";
      foot.appendChild(ok);
    }
    card.appendChild(head); card.appendChild(err); card.appendChild(bodyEl); card.appendChild(foot);
    scrim.appendChild(card); document.body.appendChild(scrim);
    var close=function(){ scrim.remove(); };
    x.onclick=close; cancel.onclick=close;
    scrim.onclick=function(e){ if(e.target===scrim) close(); };
    if(ok){ ok.onclick=function(){ var msg=onSubmit(); if(msg){ err.textContent=msg; } else { close(); } }; }
    return {scrim:scrim, card:card, close:close, err:err};
  }

  _buildForm(fields){
    var self=this, wrap=document.createElement("div"), getters={};
    fields.forEach(function(f){
      var box=document.createElement("div"); box.style.marginBottom="14px";
      if(f.type!=="amount"){
        var lab=document.createElement("label");
        lab.style.cssText="display:block;font-size:12.5px;font-weight:700;color:#5A6B78;margin-bottom:8px";
        lab.innerHTML=self._esc(f.label)+(f.required?' <span style="color:#C15F4C">*</span>':'')+(f.opt?' <span style="font-weight:500;color:#A6B0AA">(optionnel)</span>':'');
        box.appendChild(lab);
      }
      if(f.type==="amount"){
        var amt=document.createElement("div");
        amt.style.cssText="background:#F7F8F5;border:1px solid #EFF1EC;border-radius:16px;padding:16px;text-align:center";
        amt.innerHTML='<div style="font-size:12px;color:#8B98A2;font-weight:600;margin-bottom:4px">'+self._esc(f.label)+(f.required?' *':'')+'</div>';
        var row=document.createElement("div"); row.style.cssText="display:flex;align-items:center;justify-content:center;gap:6px";
        var inp=document.createElement("input");
        inp.value=f.value||""; inp.placeholder="0"; inp.setAttribute("inputmode","decimal");
        inp.style.cssText="width:160px;border:none;outline:none;background:none;text-align:center;font-size:34px;font-weight:800;color:#17293C";
        inp.oninput=function(){ inp.value=inp.value.replace(/[^0-9.,]/g,""); };
        var sym=document.createElement("span"); sym.textContent=self.curSym(); sym.style.cssText="font-size:22px;font-weight:700;color:#8B98A2";
        row.appendChild(inp); row.appendChild(sym); amt.appendChild(row); box.appendChild(amt);
        getters[f.key]=function(){ return inp.value; };
      } else if(f.type==="chips"){
        var c=document.createElement("div"); c.style.cssText="display:flex;flex-wrap:wrap;gap:8px";
        var first=f.options[0]; var cur=f.value!=null?f.value:(first&&(first.value!=null?first.value:first));
        var paints=[];
        f.options.forEach(function(o){
          var val=o.value!=null?o.value:o, txt=o.label!=null?o.label:o;
          var b=document.createElement("button"); b.type="button"; b.textContent=txt;
          var paint=function(){ var a=cur===val; b.style.cssText="padding:9px 13px;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid "+(a?"transparent":"#E1E4DE")+";background:"+(a?"#17293C":"#fff")+";color:"+(a?"#fff":"#5A6B78"); };
          b.onclick=function(){ cur=val; paints.forEach(function(p){p();}); };
          paint(); paints.push(paint); c.appendChild(b);
        });
        box.appendChild(c); getters[f.key]=function(){ return cur; };
      } else if(f.type==="select"){
        var sel=document.createElement("select");
        sel.style.cssText="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:600;outline:none;color:#17293C";
        f.options.forEach(function(o){ var val=o.value!=null?o.value:o, txt=o.label!=null?o.label:o; var op=document.createElement("option"); op.value=val; op.textContent=txt; if(f.value===val) op.selected=true; sel.appendChild(op); });
        box.appendChild(sel); getters[f.key]=function(){ return sel.value; };
      } else if(f.type==="textarea"){
        var t=document.createElement("textarea"); t.value=f.value||""; t.placeholder=f.placeholder||"";
        t.style.cssText="width:100%;min-height:66px;resize:vertical;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:500;outline:none;font-family:inherit;color:#17293C";
        box.appendChild(t); getters[f.key]=function(){ return t.value.trim(); };
      } else if(f.type==="file"){
        var picked=[];
        var b2=document.createElement("button"); b2.type="button";
        b2.style.cssText="width:100%;border:1.5px dashed #CBD3CC;background:#FAFBF9;border-radius:14px;padding:16px;display:flex;align-items:center;gap:13px;cursor:pointer;text-align:left";
        var lbl=document.createElement("div");
        var setLbl=function(){ lbl.innerHTML='<div style="font-size:13.5px;font-weight:700;color:#1E5081">'+(picked.length?self._esc(picked.length+" fichier(s) joint(s)"):"Joindre une preuve")+'</div><div style="font-size:12px;color:#8B98A2;margin-top:2px">'+(picked.length?self._esc(picked.map(function(x){return x.name;}).join(", ")).slice(0,58):"Photo, screenshot, PDF, reçu ou facture")+'</div>'; };
        b2.innerHTML='<div style="width:42px;height:42px;border-radius:12px;background:#EAF1F8;color:#1E5081;display:flex;align-items:center;justify-content:center;flex:none"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12.5l6.2-6.2a3 3 0 0 1 4.2 4.2l-8 8a5 5 0 0 1-7-7l7.4-7.4"></path></svg></div>';
        b2.appendChild(lbl); setLbl();
        var fi=document.createElement("input"); fi.type="file"; fi.multiple=true; fi.accept="image/png,image/jpeg,image/webp,application/pdf"; fi.style.display="none";
        fi.onchange=function(){ for(var i=0;i<fi.files.length;i++) picked.push(fi.files[i]); setLbl(); };
        b2.onclick=function(){ fi.click(); };
        box.appendChild(b2); box.appendChild(fi);
        getters[f.key]=function(){ return picked; };
      } else {
        var inp2=document.createElement("input");
        inp2.type=f.type==="date"?"date":"text"; inp2.value=f.value!=null?f.value:""; inp2.placeholder=f.placeholder||"";
        if(f.type==="number") inp2.setAttribute("inputmode","decimal");
        inp2.style.cssText="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:600;outline:none;color:#17293C";
        inp2.onfocus=function(){ inp2.style.borderColor="#1E5081"; inp2.style.background="#fff"; };
        inp2.onblur=function(){ inp2.style.borderColor="#E1E4DE"; inp2.style.background="#FAFBF9"; };
        if(f.type==="number") inp2.oninput=function(){ inp2.value=inp2.value.replace(/[^0-9.,]/g,""); };
        box.appendChild(inp2); getters[f.key]=function(){ return inp2.value.trim(); };
      }
      wrap.appendChild(box);
    });
    return {el:wrap, values:function(){ var o={}; Object.keys(getters).forEach(function(k){ o[k]=getters[k](); }); return o; }};
  }

  _accOpts(withNone, noneLabel){
    var self=this;
    var o=this.state.accounts.filter(function(a){ return self._same(a); }).map(function(a){ return {value:a.name,label:a.name}; });
    if(withNone) o=[{value:"",label:noneLabel||"— aucun —"}].concat(o);
    else if(!o.length) o=[{value:"",label:"— aucun compte —"}];
    return o;
  }
  _findAcc(name){ var self=this; return this.state.accounts.filter(function(a){ return a.name===name && self._same(a); })[0]; }

  /* ---------- Forms ---------- */
  openForm(kind, ctx){
    var self=this; ctx=ctx||{};
    this._trackFeature(this._evalFeatureForForm(kind),"feature_started",{kind:kind});
    var CUR=this._cur(this.state.currency);
    var P=function(v){ return self.mParse(v, CUR); };

    if(kind==="account"){
      var a=ctx.account, F=this._buildForm([
        {key:"name",label:"Nom du compte",type:"text",required:true,value:a?a.name:"",placeholder:"Ex : Compte bancaire, Espèces…"},
        {key:"type",label:"Type",type:"chips",options:["Argent liquide","Banque","Portefeuille en ligne","Transfert","Mobile","Autre"],value:a?a.type:"Banque"},
        {key:"bal",label:a?"Nouveau solde":"Solde actuel",type:"amount",required:true,value:a?this._plain(a.balance_minor,this._rc(a)):""}
      ]);
      this._mcModal(a?("Mettre à jour — "+a.name):"Ajouter un compte", F.el, function(){
        var v=F.values(); if(!v.name) return "Indique un nom de compte.";
        var accCur = a? self._rc(a) : CUR;
        var bal=self.mParse(v.bal, accCur);
        self.setState(function(s){
          var accs=s.accounts.slice();
          if(a){ accs=accs.map(function(x){ return x.id===a.id?Object.assign({},x,{name:v.name,type:v.type,balance_minor:bal,linked:true,updated:"Aujourd'hui"}):x; }); }
          else { accs=accs.concat([{id:self._uid(),name:v.name,type:v.type,balance_minor:bal,currency:CUR,updated:"Aujourd'hui",linked:true,icon:self._iconForType(v.type),c:"#1E5081",b:"#EAF1F8"}]); }
          return {accounts:accs};
        }, function(){ self._persist(); });
        self._trackFeature("available","feature_completed",{kind:"account"});
        self.showToast("ok", a?"Solde mis à jour.":"Compte ajouté.");
      }, a?"Mettre à jour":"Ajouter le compte");
    }
    else if(kind==="income"){
      var Fi=this._buildForm([
        {key:"amount",label:"Montant reçu",type:"amount",required:true},
        {key:"date",label:"Date de réception",type:"date",required:true,value:this._isoToday()},
        {key:"label",label:"Libellé",type:"text",required:true,placeholder:"Ex : Salaire — Employeur"},
        {key:"source",label:"Source",type:"chips",options:["Salaire","Freelance","Business","Cadeau","Remboursement","Autre"],value:"Salaire"},
        {key:"account",label:"Compte à créditer",type:"select",options:this._accOpts()},
        {key:"freq",label:"Fréquence",type:"chips",options:["Mensuel","Ponctuel","Hebdomadaire","Autre"],value:"Mensuel"},
        {key:"note",label:"Note",type:"text",opt:true},
        {key:"proof",label:"Justificatif",type:"file",opt:true}
      ]);
      this._mcModal("Ajouter un revenu", Fi.el, function(){
        var v=Fi.values(), amt=P(v.amount);
        if(amt<=0) return "Indique un montant.";
        if(!v.label) return "Indique un libellé.";
        const id=self._uid(), iso=self._isoDateMaybe(v.date)||self._isoToday();
        self.setState(function(s){
          const inc={id:id,source:v.source,label:v.label,amount_minor:amt,currency:CUR,freq:v.freq,date:self._fullFromIso(iso),date_iso:iso,period:self._periodFromIso(iso),month:self._monthFromIso(iso),account:v.account,note:v.note||""};
          var accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===CUR)?Object.assign({},a,{balance_minor:a.balance_minor+amt,linked:true,updated:"Aujourd'hui"}):a; });
          return {incomes:[inc].concat(s.incomes), accounts:accs};
        }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("income:"+id, v.proof).then(function(n){ if(n) self.showToast("ok","Justificatif joint au revenu."); }); } });
        self._trackFeature("income","feature_completed",{kind:"income",has_account:!!v.account,has_proof:!!(v.proof&&v.proof.length)});
        self.showToast("ok","Revenu enregistré. Le compte a été crédité.");
      }, "Enregistrer le revenu");
    }
    else if(kind==="saving"){
      var Fs=this._buildForm([
        {key:"name",label:"Nom de l'objectif",type:"text",required:true,placeholder:"Ex : Fonds d'urgence"},
        {key:"target",label:"Montant cible",type:"amount",required:true},
        {key:"saved",label:"Déjà épargné",type:"number",value:"0"},
        {key:"date",label:"Échéance",type:"date",opt:true}
      ]);
      this._mcModal("Nouvel objectif d'épargne", Fs.el, function(){
        var v=Fs.values(); if(!v.name) return "Indique un nom.";
        var t=P(v.target); if(t<=0) return "Indique un montant cible.";
        var sv=P(v.saved);
        const targetIso=self._isoDateMaybe(v.date);
        self.setState(function(s){ return {savings:s.savings.concat([{id:self._uid(),name:v.name,target_amount_minor:t,current_amount_minor:sv,currency:CUR,date:targetIso?self._fullFromIso(targetIso):"—",target_iso:targetIso,status:(sv>=t?"Atteint":"En cours")}])}; }, function(){ self._persist(); });
        self._trackFeature("savings","feature_completed",{kind:"saving"});
        self.showToast("ok","Objectif d'épargne créé.");
      }, "Créer l'objectif");
    }
    else if(kind==="saveAdd"){
      var g=this.state.savings.filter(function(x){return x.name===ctx.name;})[0]; if(!g) return;
      var gcur=this._rc(g);
      var Fsa=this._buildForm([
        {key:"amount",label:"Montant à épargner",type:"amount",required:true},
        {key:"account",label:"Déduire d'un compte",type:"select",options:this._accOpts(true,"— ne pas déduire —")}
      ]);
      this._mcModal("Épargner — "+g.name, Fsa.el, function(){
        var v=Fsa.values(), amt=self.mParse(v.amount,gcur); if(amt<=0) return "Indique un montant.";
        self.setState(function(s){
          var cid=self._uid();
          var savings=s.savings.map(function(x){ if(x.id!==g.id) return x; var ns=x.current_amount_minor+amt; return Object.assign({},x,{current_amount_minor:Math.min(x.target_amount_minor,ns),status:(ns>=x.target_amount_minor?"Atteint":x.status)}); });
          var accs=s.accounts; if(v.account) accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===gcur)?Object.assign({},a,{balance_minor:a.balance_minor-amt,updated:"Aujourd'hui"}):a; });
          const iso=self._isoToday(), contrib={id:cid,savings_goal_id:g.id,account:v.account||"",amount_minor:amt,currency:gcur,date:self._fullFromIso(iso),date_iso:iso,period:self._periodFromIso(iso),note:""};
          return {savings:savings, accounts:accs, savingsContributions:(s.savingsContributions||[]).concat([contrib])};
        }, function(){ self._persist(); });
        self._trackFeature("savings","feature_completed",{kind:"saveAdd",has_account:!!v.account});
        self.showToast("ok","Épargne mise à jour. Continue comme ça.");
      }, "Épargner");
    }
    else if(kind==="pot"){
      var Fp=this._buildForm([
        {key:"name",label:"Nom de l'objet",type:"text",required:true,placeholder:"Ex : iPhone 15"},
        {key:"price",label:"Prix de l'objet",type:"amount",required:true},
        {key:"saved",label:"Déjà cotisé",type:"number",value:"0"},
        {key:"priority",label:"Priorité",type:"chips",options:["Haute","Moyenne","Basse"],value:"Moyenne"},
        {key:"date",label:"Souhaité pour",type:"date",opt:true}
      ]);
      this._mcModal("Nouvelle cagnotte", Fp.el, function(){
        var v=Fp.values(); if(!v.name) return "Indique le nom de l'objet.";
        var pr=P(v.price); if(pr<=0) return "Indique un prix.";
        var sv=P(v.saved);
        const potTargetIso=self._isoDateMaybe(v.date);
        self.setState(function(s){ return {pots:s.pots.concat([{id:self._uid(),name:v.name,target_amount_minor:pr,current_amount_minor:sv,currency:CUR,date:potTargetIso?self._fullFromIso(potTargetIso):"—",target_iso:potTargetIso,priority:v.priority,status:(sv>=pr?"Atteint":"En cours")}])}; }, function(){ self._persist(); });
        self._trackFeature("pots","feature_completed",{kind:"pot"});
        self.showToast("ok","Cagnotte créée. Cotise avant d'acheter.");
      }, "Créer la cagnotte");
    }
    else if(kind==="potAdd"){
      var gp=this.state.pots.filter(function(x){return x.name===ctx.name;})[0]; if(!gp) return;
      var pcur=this._rc(gp);
      var Fpa=this._buildForm([
        {key:"amount",label:"Montant à cotiser",type:"amount",required:true},
        {key:"account",label:"Déduire d'un compte",type:"select",options:this._accOpts(true,"— ne pas déduire —")}
      ]);
      this._mcModal("Cotiser — "+gp.name, Fpa.el, function(){
        var v=Fpa.values(), amt=self.mParse(v.amount,pcur); if(amt<=0) return "Indique un montant.";
        var reached=false;
        self.setState(function(s){
          var cid=self._uid();
          var pots=s.pots.map(function(x){ if(x.id!==gp.id) return x; var ns=x.current_amount_minor+amt; if(ns>=x.target_amount_minor) reached=true; return Object.assign({},x,{current_amount_minor:Math.min(x.target_amount_minor,ns),status:(ns>=x.target_amount_minor?"Atteint":x.status)}); });
          var accs=s.accounts; if(v.account) accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===pcur)?Object.assign({},a,{balance_minor:a.balance_minor-amt,updated:"Aujourd'hui"}):a; });
          const iso=self._isoToday(), contrib={id:cid,purchase_goal_id:gp.id,account:v.account||"",amount_minor:amt,currency:pcur,date:self._fullFromIso(iso),date_iso:iso,period:self._periodFromIso(iso),note:""};
          return {pots:pots, accounts:accs, purchaseContributions:(s.purchaseContributions||[]).concat([contrib])};
        }, function(){ self._persist(); });
        self._trackFeature("pots","feature_completed",{kind:"potAdd",has_account:!!v.account});
        if(reached) self.showToast("ok","Objectif atteint ! Tu peux acheter sans toucher à ton budget.");
        else self.showToast("ok","Tu avances bien — cotisation ajoutée.");
      }, "Cotiser");
    }
    else if(kind==="debt"){
      var Fd=this._buildForm([
        {key:"name",label:"Nom de la dette",type:"text",required:true,placeholder:"Ex : Dette voiture"},
        {key:"creditor",label:"Créancier",type:"text",required:true,placeholder:"À qui dois-tu cet argent ?"},
        {key:"total",label:"Montant total",type:"amount",required:true},
        {key:"paid",label:"Déjà payé",type:"amount",value:"0"},
        {key:"minimum",label:"Minimum mensuel",type:"amount",required:true},
        {key:"apr",label:"Taux si tu le connais (%)",type:"number",opt:true,value:"0"},
        {key:"due",label:"Prochaine échéance",type:"date",opt:true}
      ]);
      this._mcModal("Ajouter une dette", Fd.el, function(){
        var v=Fd.values(); if(!v.name) return "Indique un nom."; if(!v.creditor) return "Indique le créancier.";
        var tot=P(v.total); if(tot<=0) return "Indique le montant total.";
        var pd=self._debtPaidMinor(tot,P(v.paid));
        var min=P(v.minimum); if(min<=0) return "Indique le minimum mensuel.";
        var apr=Math.max(0,Math.round(self._numInput(v.apr)*100)||0);
        self.setState(function(s){
          const dueIso=self._isoDateMaybe(v.due), debt={id:self._uid(),name:v.name,creditor:v.creditor,total_amount_minor:tot,paid_amount_minor:pd,currency:CUR,due:dueIso?self._fullFromIso(dueIso):"—",due_iso:dueIso,status:(pd>=tot?"Soldée":"À jour"),minimum_minor:min,apr_bps:apr,start_date_iso:self._isoToday()};
          return {debts:s.debts.concat([debt]),financialPlan:self._planWithDebtMeta(s.financialPlan,debt,CUR)};
        }, function(){ self._persist(); });
        self._trackFeature("debts","feature_completed",{kind:"debt"});
        self.showToast("ok","Dette enregistrée — suivi clair et serein.");
      }, "Ajouter la dette");
    }
    else if(kind==="debtPay"){
      var gd=this.state.debts.filter(function(x){return x.name===ctx.name;})[0]; if(!gd) return;
      var dcur=this._rc(gd);
      var Fdp=this._buildForm([
        {key:"amount",label:"Montant payé",type:"amount",required:true},
        {key:"account",label:"Depuis le compte",type:"select",options:this._accOpts(true,"— ne pas déduire —")},
        {key:"due",label:"Prochaine échéance",type:"date",opt:true,value:gd.due_iso||self._isoDateMaybe(gd.due)||""},
        {key:"proof",label:"Preuve de paiement",type:"file",opt:true}
      ]);
      this._mcModal("Paiement — "+gd.name, Fdp.el, function(){
        var v=Fdp.values(), amt=self.mParse(v.amount,dcur); if(amt<=0) return "Indique un montant.";
        var pid=self._uid();
        self.setState(function(s){
          const dueIso=self._isoDateMaybe(v.due);
          const debts=s.debts.map(function(x){
            if(x.id!==gd.id) return x;
            const np=Math.min(x.total_amount_minor,x.paid_amount_minor+amt);
            let status=x.status;
            if(np>=x.total_amount_minor) status="Soldée";
            else if(status==="En retard") status="À jour";
            return {...x,paid_amount_minor:np,due:dueIso?self._fullFromIso(dueIso):x.due,due_iso:dueIso||x.due_iso||null,status:status};
          });
          var accs=s.accounts; if(v.account) accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===dcur)?Object.assign({},a,{balance_minor:a.balance_minor-amt,updated:"Aujourd'hui"}):a; });
          const iso=self._isoToday(), pay={id:pid,debt_id:gd.id,account:v.account||"",amount_minor:amt,currency:dcur,date:self._fullFromIso(iso),date_iso:iso,period:self._periodFromIso(iso),note:""};
          return {debts:debts, accounts:accs, debtPayments:(s.debtPayments||[]).concat([pay])};
        }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("debt:"+gd.id+":"+pid, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve de paiement jointe."); }); } });
        self._trackFeature("debts","feature_completed",{kind:"debtPay",has_account:!!v.account,has_proof:!!(v.proof&&v.proof.length)});
        self.showToast("ok","Paiement enregistré. Tu avances bien.");
      }, "Enregistrer le paiement");
    }
    else if(kind==="loan"){
      var Fl=this._buildForm([
        {key:"name",label:"Nom de la personne",type:"text",required:true,placeholder:"Ex : Karim"},
        {key:"rel",label:"Relation",type:"text",opt:true,placeholder:"Ex : Ami, Sœur, Collègue"},
        {key:"lent",label:"Montant prêté",type:"amount",required:true},
        {key:"repaid",label:"Déjà remboursé",type:"number",value:"0"},
        {key:"due",label:"Retour prévu",type:"date",opt:true},
        {key:"proof",label:"Preuve du prêt",type:"file",opt:true}
      ]);
      this._mcModal("Ajouter un prêt accordé", Fl.el, function(){
        var v=Fl.values(); if(!v.name) return "Indique la personne.";
        var lent=P(v.lent); if(lent<=0) return "Indique le montant prêté.";
        var rp=P(v.repaid), id=self._uid();
        const loanDueIso=self._isoDateMaybe(v.due), loanDateIso=self._isoToday();
        let loanStatus="En attente";
        if(rp>=lent) loanStatus="Remboursé";
        else if(rp>0) loanStatus="En cours";
        self.setState(function(s){ return {loans:s.loans.concat([{id:id,name:v.name,rel:v.rel||"—",amount_lent_minor:lent,amount_repaid_minor:rp,currency:CUR,due:loanDueIso?self._fullFromIso(loanDueIso):"—",due_iso:loanDueIso,loan_date_iso:loanDateIso,status:loanStatus,proof:!!v.proof?.length}])}; }, function(){ self._persist(); if(v.proof?.length){ self._saveFiles("loan:"+id, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve du prêt jointe."); }); } });
        self._trackFeature("loans","feature_completed",{kind:"loan",has_proof:!!(v.proof&&v.proof.length)});
        self.showToast("ok","Prêt enregistré — suivi séparé de tes dettes.");
      }, "Ajouter le prêt");
    }
    else if(kind==="loanFollow"){
      var gl=this.state.loans.filter(function(x){return x.name===ctx.name;})[0]; if(!gl) return;
      var lcur=this._rc(gl);
      var Flr=this._buildForm([
        {key:"amount",label:"Remboursement reçu",type:"amount",required:true},
        {key:"account",label:"Compte à créditer",type:"select",options:this._accOpts(true,"— ne pas créditer —")},
        {key:"proof",label:"Preuve du remboursement",type:"file",opt:true}
      ]);
      var m=this._mcModal("Suivi — "+gl.name, Flr.el, function(){
        var v=Flr.values(), amt=self.mParse(v.amount,lcur); if(amt<=0) return "Indique un montant reçu.";
        var rid=self._uid();
        self.setState(function(s){
          var loans=s.loans.map(function(x){ if(x.id!==gl.id) return x; var nr=Math.min(x.amount_lent_minor,x.amount_repaid_minor+amt); return Object.assign({},x,{amount_repaid_minor:nr,status:(nr>=x.amount_lent_minor?"Remboursé":"En cours")}); });
          var accs=s.accounts; if(v.account) accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===lcur)?Object.assign({},a,{balance_minor:a.balance_minor+amt,linked:true,updated:"Aujourd'hui"}):a; });
          const iso=self._isoToday(), rep={id:rid,loan_id:gl.id,account:v.account||"",amount_minor:amt,currency:lcur,date:self._fullFromIso(iso),date_iso:iso,period:self._periodFromIso(iso),note:""};
          return {loans:loans, accounts:accs, loanRepayments:(s.loanRepayments||[]).concat([rep])};
        }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("loanrepay:"+gl.id+":"+rid, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve jointe."); }); } });
        self._trackFeature("loans","feature_completed",{kind:"loanFollow",has_account:!!v.account,has_proof:!!(v.proof&&v.proof.length)});
        self.showToast("ok","Remboursement enregistré. Le compte a été crédité.");
      }, "Enregistrer le remboursement");
      var remind=document.createElement("button");
      remind.type="button"; remind.textContent="Plutôt envoyer un rappel amical";
      remind.style.cssText="width:100%;margin-top:2px;padding:11px;border-radius:12px;background:#EAF1F8;color:#1E5081;font-size:13px;font-weight:700;cursor:pointer;border:1px solid #D3E0EE";
      remind.onclick=function(){ m.close(); self.showToast("ok","Un petit rappel amical a été noté."); };
      Flr.el.appendChild(remind);
    }
  }

  /* Minor-unit integer -> editable string without symbol, used to prefill fields. */
  _plain(minor, currency){
    var exp=this._exp(currency), div=this._pow(exp);
    var n=Math.trunc(Number(minor)||0), abs=Math.abs(n);
    var whole=Math.trunc(abs/div), frac=abs-whole*div;
    if(exp===0 || frac===0) return String(n<0?-whole:whole);
    var f=String(frac); while(f.length<exp) f="0"+f;
    return (n<0?"-":"")+whole+","+f;
  }

  /* ---------- Attachments: view / add / delete ---------- */
  openAttManager(parent, title){
    var self=this;
    var body=document.createElement("div");
    this._mcModal(title, body, null);
    var refresh=function(){
      self._filesByParent(parent).then(function(files){
        body.innerHTML="";
        var hint=document.createElement("div");
        hint.style.cssText="font-size:12.5px;color:#8B98A2;margin-bottom:12px";
        hint.textContent="Reçus, captures Cash App / Zelle, factures, PDF… (5 Mo max). Fichiers privés, uniquement sur cet appareil.";
        body.appendChild(hint);
        var grid=document.createElement("div");
        grid.style.cssText="display:flex;flex-wrap:wrap;gap:10px";
        files.forEach(function(f){
          var cell=document.createElement("div"); cell.style.cssText="position:relative;width:92px";
          var isPdf=f.mime==="application/pdf";
          var thumb=document.createElement(isPdf?"div":"img");
          thumb.style.cssText="width:92px;height:92px;border-radius:12px;border:1px solid #E7E9E4;object-fit:cover;background:#F7F8F5;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:30px";
          if(isPdf) thumb.textContent="📄"; else thumb.src=f.url||f.data;
          thumb.onclick=function(){ self._openFile(f); };
          var del=document.createElement("button"); del.type="button"; del.textContent="✕";
          del.style.cssText="position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:99px;background:#C15F4C;color:#fff;border:2px solid #fff;font-size:11px;cursor:pointer;line-height:1";
          del.onclick=function(){ self._deleteFile(f).then(refresh); };
          var nm=document.createElement("div"); nm.style.cssText="font-size:10.5px;color:#8B98A2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"; nm.textContent=f.name;
          cell.appendChild(thumb); cell.appendChild(del); cell.appendChild(nm); grid.appendChild(cell);
        });
        var add=document.createElement("button"); add.type="button"; add.textContent="＋";
        add.style.cssText="width:92px;height:92px;border-radius:12px;border:2px dashed #CBD3CC;background:#FAFBF9;color:#8B98A2;font-size:26px;cursor:pointer";
        var fi=document.createElement("input"); fi.type="file"; fi.multiple=true; fi.accept="image/png,image/jpeg,image/webp,application/pdf"; fi.style.display="none";
        fi.onchange=function(){ self._saveFiles(parent, fi.files).then(function(n){ if(n) self.showToast("ok",n+" pièce(s) ajoutée(s)."); refresh(); }); };
        add.onclick=function(){ fi.click(); };
        grid.appendChild(add); body.appendChild(grid);
        if(!files.length){ var e=document.createElement("div"); e.style.cssText="font-size:13px;color:#A6B0AA;margin-top:10px"; e.textContent="Aucune pièce pour le moment. Touche ＋ pour en ajouter."; body.appendChild(e); }
      });
    };
    refresh();
  }

  /* ---------- Make expense rows clickable ---------- */
  _wireRows(){
    try{
      var S=this.state, self=this;
      const selected=S.fExpMonth==="current"?this._currentPeriod():S.fExpMonth;
      const list=S.page==="income" ? (S.incomes||[]) : S.expenses.filter(function(e){ return (selected==="Tous"||self._recordInPeriod(e,selected))&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat); });
      var rows=document.querySelectorAll('div[style*="padding: 14px 15px"]');
      Array.prototype.forEach.call(rows, function(el,i){
        el.__mcExp=S.page==="income"?null:list[i];
        el.__mcInc=S.page==="income"?list[i]:null;
        if(el.__mcWired) return;
        el.__mcWired=true;
        el.style.cursor="pointer";
        el.title="Voir / ajouter les justificatifs";
        el.addEventListener("click", function(){
          var ex=el.__mcExp, inc=el.__mcInc;
          if(ex) self.openAttManager("expense:"+ex.id, "Justificatifs — "+(ex.payee||ex.cat));
          if(inc) self.openAttManager("income:"+inc.id, "Justificatifs — "+(inc.label||inc.source));
        });
      });
    }catch(e){}
  }

  _plannerStyle(){
    return "font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;color:#17293C";
  }
  _fieldHtml(id,label,value,placeholder,type){
    var t=type||"text";
    return '<label style="display:block;font-size:12.5px;font-weight:800;color:#5A6B78;margin-bottom:7px">'+this._esc(label)+'</label><input id="'+id+'" type="'+t+'" value="'+this._esc(value||"")+'" placeholder="'+this._esc(placeholder||"")+'" style="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:600;outline:none;color:#17293C;margin-bottom:13px">';
  }
  _rangeHtml(id,label,value,min,max,step,suffix){
    var v=Number(value)||0, s=suffix||"";
    return '<label style="display:flex;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:800;color:#5A6B78;margin-bottom:7px"><span>'+this._esc(label)+'</span><span id="'+id+'_val" style="color:#17293C">'+this._esc(String(v)+" "+s)+'</span></label><input id="'+id+'" type="range" value="'+this._esc(v)+'" min="'+this._esc(min)+'" max="'+this._esc(max)+'" step="'+this._esc(step||1)+'" data-suffix="'+this._esc(s)+'" style="width:100%;accent-color:#1E5081;margin:5px 0 16px">';
  }
  _areaHtml(id,label,value,placeholder){
    return '<label style="display:block;font-size:12.5px;font-weight:800;color:#5A6B78;margin-bottom:7px">'+this._esc(label)+'</label><textarea id="'+id+'" placeholder="'+this._esc(placeholder||"")+'" style="width:100%;min-height:86px;resize:vertical;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:500;outline:none;color:#17293C;margin-bottom:13px">'+this._esc(value||"")+'</textarea>';
  }
  _selectHtml(id,label,value,options){
    var html='<label style="display:block;font-size:12.5px;font-weight:800;color:#5A6B78;margin-bottom:7px">'+this._esc(label)+'</label><select id="'+id+'" style="width:100%;border:1px solid #E1E4DE;background:#FAFBF9;border-radius:12px;padding:12px;font-size:13.5px;font-weight:700;outline:none;color:#17293C;margin-bottom:13px">';
    (options||[]).forEach((o)=>{ var val=o.value!=null?o.value:o, txt=o.label!=null?o.label:o; html+='<option value="'+this._esc(val)+'" '+(String(value)===String(val)?"selected":"")+'>'+this._esc(txt)+'</option>'; });
    return html+"</select>";
  }
  _obDetailsHtml(title,hint,inner,open){
    return '<details '+(open?'open ':'')+'style="border:1px solid #EFF1EC;background:#F7F8F5;border-radius:16px;padding:12px;margin-bottom:13px"><summary style="cursor:pointer;color:#1E5081;font-size:13px;font-weight:900">'+this._esc(title)+'</summary><div style="margin-top:4px;color:#8B98A2;font-size:11.5px;line-height:1.45">'+this._esc(hint||"Optionnel. Tu peux compléter plus tard.")+'</div><div style="margin-top:10px">'+inner+'</div></details>';
  }
  _wirePlanningUi(){
    try{
      var self=this;
      if(this._needsOnboarding()){
        this._renderOnboarding();
      } else {
        var ob=document.getElementById("mc-onboarding"); if(ob) ob.remove();
      }
      var existing=document.getElementById("mc-plan-launcher");
      if(this._cloudEnabled() && this._cloudUser && !this._needsOnboarding()){
        if(!existing){
          var b=document.createElement("button");
          b.id="mc-plan-launcher"; b.type="button"; b.textContent="Plan";
          b.style.cssText="position:fixed;right:18px;bottom:18px;z-index:7500;border:none;border-radius:15px;background:linear-gradient(160deg,#1E5081,#17405F);color:#fff;padding:13px 16px;font-size:13.5px;font-weight:800;box-shadow:0 14px 30px rgba(30,80,129,.26);cursor:pointer";
          b.onclick=function(){ self._openPlanPanel(); };
          document.body.appendChild(b);
        }
      } else if(existing){ existing.remove(); }
    }catch(e){}
  }
  _wireDebtDecisionUi(){
    try{
      var existing=document.getElementById("mc-debt-decision-inline");
      if(this.state.page!=="debts"){
        if(existing) existing.remove();
        return;
      }
      var debtPlan=this._debtDecisionPlan();
      var matches=Array.prototype.slice.call(document.querySelectorAll("div")).filter(function(el){
        var txt=String(el.textContent||"");
        return el.id!=="mc-debt-decision-inline" && txt.includes("Total à rembourser");
      }).sort(function(a,b){ return String(a.textContent||"").length-String(b.textContent||"").length; });
      var totalCard=matches[0];
      var host=totalCard&&totalCard.parentElement;
      if(!host) return;
      if(existing) existing.remove();
      var panel=document.createElement("div");
      panel.id="mc-debt-decision-inline";
      panel.style.cssText="background:#fff;border:1px solid #E7E9E4;border-radius:18px;padding:16px;box-shadow:0 1px 2px rgba(20,40,60,.04)";
      if(debtPlan.ok){
        panel.innerHTML='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px"><div style="min-width:0;flex:1"><div style="font-size:11.5px;font-weight:900;letter-spacing:.04em;color:#3F9A5A;text-transform:uppercase;margin-bottom:5px">Aide à la décision</div><h3 style="margin:0;font-size:18px;font-weight:900;color:#17293C">'+this._esc(debtPlan.headline)+'</h3></div><span style="font-size:12px;font-weight:900;color:#1E5081;background:#EAF1F8;border-radius:99px;padding:6px 10px">'+this._esc(debtPlan.strategyLabel)+'</span></div><p style="margin:0 0 11px;font-size:13px;line-height:1.45;color:#5A6B78">'+this._esc(debtPlan.why)+'</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px;margin-bottom:10px">'+this._metricCard("Dette cible",debtPlan.targetName,"À traiter maintenant")+this._metricCard("Paiement cible",debtPlan.targetPayStr,"Minimum + surplus")+this._metricCard("Fin estimée",debtPlan.targetDoneStr,"Si le rythme tient")+'</div><div style="font-size:13px;line-height:1.45;color:#17293C;background:#F7F8F5;border:1px solid #EFF1EC;border-radius:13px;padding:11px 12px;margin-bottom:11px">'+this._esc(debtPlan.action)+'</div><button id="mc-debt-plan-open" type="button" style="width:100%;padding:12px 13px;border-radius:12px;background:#EAF1F8;color:#1E5081;font-size:13.5px;font-weight:900;border:1px solid #D3E0EE;cursor:pointer">Voir toute la projection</button>';
      } else {
        panel.innerHTML='<div style="font-size:11.5px;font-weight:900;letter-spacing:.04em;color:#3F9A5A;text-transform:uppercase;margin-bottom:5px">Aide à la décision</div><h3 style="margin:0 0 7px;font-size:18px;font-weight:900;color:#17293C">Ajoute tes dettes</h3><p style="margin:0;font-size:13px;line-height:1.45;color:#5A6B78">Dès que tu ajoutes le montant restant, le minimum mensuel et le taux si tu le connais, Mon Coffre te dira quoi payer en premier.</p>';
      }
      if(totalCard.nextSibling) host.insertBefore(panel,totalCard.nextSibling);
      else host.appendChild(panel);
      var open=document.getElementById("mc-debt-plan-open");
      if(open) open.onclick=()=>this._openPlanPanel();
    }catch(e){}
  }
  _onboardingStepMeta(){
    return [
      {title:"Démarrage",sub:"Devise, revenu actuel et rythme de paie. Deux minutes suffisent pour commencer."},
      {title:"Comptes",sub:"Banques, soldes actuels et rôle de chaque compte."},
      {title:"Dépenses fixes",sub:"Loyer, abonnements, transferts famille et dates."},
      {title:"Argent à rembourser",sub:"Cartes, prêts ou paiements en cours. Mon Coffre t'aidera à choisir quoi payer en premier."},
      {title:"Objectifs",sub:"Coussin, cagnottes, achats planifiés et immobilier."},
      {title:"Habitudes",sub:"Risques, bilan mensuel et seuils d'alerte."}
    ];
  }
  _renderOnboarding(){
    var self=this, p=this._plan(), step=Math.max(0,Math.min(5,Number(p.onboarding.step)||0)), meta=this._onboardingStepMeta();
    var el=document.getElementById("mc-onboarding");
    if(!el){ el=document.createElement("div"); el.id="mc-onboarding"; document.body.appendChild(el); }
    var r=p.raw||{}, life=p.lifestyle||{}, snow=p.snowball||{}, re=p.realEstate||{}, fund=p.funding||{}, rev=p.monthlyReview||{};
    var body="";
    if(step===0){
      body+=this._fieldHtml("ob_new_income","Revenu mensuel actuel",this._plain(life.new_income_minor||0,p.profile.main_currency||"USD"),"Ex : 5300","text");
      body+=this._selectHtml("ob_cur","Devise principale",p.profile.main_currency||this.state.currency,["USD","EUR","XOF","XAF"]);
      body+=this._selectHtml("ob_pay_freq","Rythme de paiement principal",p.profile.pay_frequency||"Mensuel",["Mensuel","Bi-hebdomadaire","Hebdomadaire","Variable"]);
      body+=this._fieldHtml("ob_baseline","Dépenses mensuelles habituelles",this._plain(life.baseline_expense_minor||0,p.profile.main_currency||"USD"),"Ex : 2100","text");
      body+='<p style="margin:0 0 13px;color:#5A6B78;font-size:12.5px;line-height:1.45">Avec ces infos, Mon Coffre peut déjà estimer ton argent disponible chaque mois et repérer si tes dépenses montent avec ton revenu.</p>';
      body+=this._fieldHtml("ob_name","Nom affiché optionnel",p.profile.display_name,"Ex : Paul");
      body+='<details style="margin-bottom:13px"><summary style="cursor:pointer;color:#1E5081;font-size:13px;font-weight:900">J’ai récemment eu un changement de revenu</summary><div style="margin-top:10px">'+this._fieldHtml("ob_old_income","Revenu mensuel avant changement",this._plain(life.old_income_minor||0,p.profile.main_currency||"USD"),"Ex : 3000","text")+this._fieldHtml("ob_change","Date du changement",life.change_date||"","Ex : 2026-07-01","text")+'</div></details>';
      body+='<details style="margin-bottom:13px"><summary style="cursor:pointer;color:#1E5081;font-size:13px;font-weight:900">Détailler mes sources de revenus</summary><div style="margin-top:10px">'+this._obRepeatHtml("income","Sources de revenus",this._obRows("income",p,true),"+ Ajouter une source","Ajoute une source seulement si tu veux détailler InvenTech, DoorDash, Concierge, etc.")+'</div></details>';
    } else if(step===1){
      body+=this._obRepeatHtml("accounts","Comptes",this._obRows("accounts",p,true),"+ Ajouter un compte","Le rôle vient d'une liste fermée pour que le coussin, l'épargne et les dépenses soient reconnus automatiquement.");
    } else if(step===2){
      body+=this._obRepeatHtml("fixedExpenses","Dépenses fixes",this._obRows("fixedExpenses",p,true),"+ Ajouter une dépense","Ajoute au moins une dépense fixe, ou passe si aucune ne s'applique.");
    } else if(step===3){
      body+=this._fieldHtml("ob_debt_budget","Combien peux-tu payer par mois ?",this._plain(snow.monthly_budget_minor||0,p.profile.main_currency||"USD"),"Ex : 300","text");
      body+='<p style="margin:-4px 0 13px;color:#8B98A2;font-size:12px;line-height:1.45">Mets le montant total que tu peux envoyer chaque mois pour rembourser tes cartes, prêts ou factures. Si tu ne sais pas encore, laisse 0.</p>';
      body+=this._obRepeatHtml("debts","Ce que je dois rembourser",this._obRows("debts",p,true),"+ Ajouter une dette","Ajoute une carte, un prêt ou une facture à rembourser. Si tu n'as rien, clique Passer cette étape.");
    } else if(step===4){
      var goalRows=this._obRows("goals",p,true), purchaseRows=this._obRows("plannedPurchases",p,true);
      var hasGoals=this._obRows("goals",p).length>0, hasPurchases=this._obRows("plannedPurchases",p).length>0, hasRealEstate=(re.status==="yes");
      body+=this._fieldHtml("ob_emergency","Argent à garder pour les urgences",this._plain((p.emergency_target_minor||0),p.profile.main_currency||"USD"),"Ex : 800","text");
      body+='<p style="margin:-4px 0 13px;color:#8B98A2;font-size:12px;line-height:1.45">Ce montant sert de coussin de sécurité. Mets une cible simple, ou laisse 0 si tu veux décider plus tard.</p>';
      body+=this._selectHtml("ob_seq","Comment veux-tu avancer ?",fund.mode||"sequential",[{value:"sequential",label:"Un objectif à la fois (plus simple)"},{value:"parallel",label:"Plusieurs objectifs en même temps"}]);
      body+=this._obDetailsHtml("Ajouter une cagnotte ou un objectif","Exemples : coussin, voyage, apport, épargne décembre. Ouvre seulement si tu as déjà un objectif clair.",this._obRepeatHtml("goals","Objectifs / cagnottes",goalRows,"+ Ajouter un objectif","Ajoute seulement ce que tu connais maintenant."),hasGoals);
      body+=this._obDetailsHtml("Préparer un achat cash","Exemples : ordinateur, téléphone, meuble. Ouvre seulement si tu veux planifier un achat précis.",this._obRepeatHtml("plannedPurchases","Achats planifiés",purchaseRows,"+ Ajouter un achat","Ajoute un achat cash anti-Klarna, ou laisse vide."),hasPurchases);
      body+=this._obDetailsHtml("Projet immobilier","Optionnel. Si ce n'est pas ton sujet maintenant, laisse sur Pas encore.",this._selectHtml("ob_re_status","Est-ce que tu prépares un achat immobilier ?",re.status||"not_yet",[{value:"yes",label:"Oui"},{value:"not_yet",label:"Pas encore"},{value:"no",label:"Non"}])+this._fieldHtml("ob_re_price","Prix visé si tu le connais",this._plain(re.target_price_minor||0,p.profile.main_currency||"USD"),"Ex : 230000","text")+this._fieldHtml("ob_re_rate","Taux estimé si tu le connais",String((re.rate_bps||700)/100).replace(".",","),"Ex : 7","text"),hasRealEstate);
    } else {
      body+=this._areaHtml("ob_risk","Où part ton argent sans que tu le voies ?",r.riskAreas,"Ex : fast-food, Apple, essence, achats impulsifs");
      body+=this._fieldHtml("ob_payday","Jour de paie le plus dangereux",r.dangerousPayday,"Ex : vendredi soir","text");
      body+=this._fieldHtml("ob_threshold","Seuil alerte inflation de style de vie (%)",life.threshold_pct||15,"Ex : 15","text");
      body+=this._fieldHtml("ob_excluded","Exclusions inflation",life.excluded||"","Ex : loyer, urgence médicale, dettes","text");
      body+=this._selectHtml("ob_review","Bilan mensuel automatique",rev.enabled===false?"no":"yes",[{value:"yes",label:"Oui"},{value:"no",label:"Non"}]);
    }
    el.style.cssText="position:fixed;inset:0;z-index:9800;background:rgba(243,244,241,.98);display:flex;align-items:center;justify-content:center;padding:18px;"+this._plannerStyle();
    el.innerHTML='<div style="width:100%;max-width:760px;max-height:94vh;overflow:auto;background:#fff;border:1px solid #E7E9E4;border-radius:26px;box-shadow:0 24px 70px rgba(20,40,60,.18);padding:24px"><div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:18px"><div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(160deg,#1E5081,#17405F);color:#8FE0A5;display:flex;align-items:center;justify-content:center;font-weight:900">'+(step+1)+'/6</div><div style="flex:1"><div style="font-size:12px;font-weight:900;color:#3F9A5A;text-transform:uppercase;letter-spacing:.08em">Onboarding</div><h2 style="margin:4px 0 4px;font-size:24px;line-height:1.15">'+this._esc(meta[step].title)+'</h2><p style="margin:0;color:#5A6B78;font-size:13.5px;line-height:1.45">'+this._esc(meta[step].sub)+'</p></div></div><div style="height:8px;background:#EFF1EC;border-radius:999px;margin-bottom:18px"><div style="height:100%;width:'+Math.round((step+1)/6*100)+'%;border-radius:999px;background:#3F9A5A"></div></div><div id="mc-ob-error" style="min-height:18px;color:#C15F4C;font-size:13px;font-weight:800;margin-bottom:6px"></div>'+body+'<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"><button id="mc-ob-back" type="button" style="flex:1;min-width:130px;padding:14px;border-radius:13px;border:1px solid #DDE0DA;background:#fff;color:#5A6B78;font-size:14px;font-weight:800;cursor:pointer;'+(step===0?"opacity:.45":"")+'">Retour</button><button id="mc-ob-skip" type="button" style="flex:1;min-width:150px;padding:14px;border-radius:13px;border:1px solid #DDE0DA;background:#fff;color:#1E5081;font-size:14px;font-weight:900;cursor:pointer">Passer cette étape</button><button id="mc-ob-next" type="button" style="flex:2;min-width:180px;padding:14px;border-radius:13px;border:none;background:linear-gradient(160deg,#1E5081,#17405F);color:#fff;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(30,80,129,.22)">'+(step===5?"Terminer et entrer dans l'app":"Continuer")+'</button></div><p style="margin:14px 0 0;color:#8B98A2;font-size:12px;line-height:1.45">Ajoute les informations disponibles maintenant, ou clique <b>Passer cette étape</b> si la situation ne te concerne pas. Tu pourras compléter plus tard.</p></div>';
    var back=el.querySelector("#mc-ob-back"), skip=el.querySelector("#mc-ob-skip"), next=el.querySelector("#mc-ob-next");
    back.onclick=function(){ if(step>0){ p.onboarding.step=step-1; self._setPlan(p); } };
    skip.onclick=function(){ var err=self._saveOnboardingStep(step,true); if(err){ el.querySelector("#mc-ob-error").textContent=err; return; } self._trackFeature("onboarding","feature_skipped",{step:step}); p=self._plan(); if(step<5){ p.onboarding.step=step+1; self._setPlan(p); } else { self._completeOnboarding(); } };
    next.onclick=function(){ var err=self._saveOnboardingStep(step,false); if(err){ el.querySelector("#mc-ob-error").textContent=err; return; } self._trackFeature("onboarding","feature_completed",{step:step}); p=self._plan(); if(step<5){ p.onboarding.step=step+1; self._setPlan(p); } else { self._completeOnboarding(); } };
    el.onclick=function(e){
      var b=e.target && e.target.closest ? e.target.closest("[data-ob-action]") : null; if(!b) return;
      var kind=b.getAttribute("data-ob-kind"), action=b.getAttribute("data-ob-action"), plan=self._plan(), rows=self._collectObRows(kind,true);
      if(action==="add") rows.push(self._obDefaultRow(kind));
      if(action==="remove") rows.splice(Number(b.getAttribute("data-ob-index"))||0,1);
      plan.structured=plan.structured||{}; plan.structured[kind]=rows; if(plan.raw) plan.raw[kind]=self._obSerialize(kind,rows);
      self._trackFeature("onboarding","feature_started",{step:step,section:kind,action:action});
      self._setPlan(plan);
    };
  }
  _saveOnboardingStep(step, skip){
    var p=this._plan(), cur=(document.getElementById("ob_cur")&&document.getElementById("ob_cur").value)||p.profile.main_currency||this.state.currency, life=p.lifestyle, r=p.raw;
    function val(id){ var e=document.getElementById(id); return e?e.value.trim():""; }
    p.structured=p.structured||{};
    if(step===0){
      var incomeRows=skip?[]:this._collectObRows("income"), incomeErr=incomeRows.length?this._obRowsError("income",incomeRows,true):"";
      if(!skip && incomeErr) return incomeErr;
      if(!skip && this._moneyInput(val("ob_new_income"),cur)<=0) return "Indique ton revenu mensuel actuel, ou clique Passer cette étape.";
      p.profile.display_name=val("ob_name")||p.profile.display_name; p.profile.main_currency=cur; p.profile.pay_frequency=val("ob_pay_freq")||p.profile.pay_frequency||"Mensuel"; p.structured.income=incomeRows; p.raw.income=this._obSerialize("income",incomeRows);
      life.old_income_minor=this._moneyInput(val("ob_old_income"),cur); life.new_income_minor=this._moneyInput(val("ob_new_income"),cur); life.baseline_expense_minor=this._moneyInput(val("ob_baseline"),cur); life.change_date=val("ob_change");
    } else if(step===1){
      var accountRows=skip?[]:this._collectObRows("accounts"), accountErr=skip?"":this._obRowsError("accounts",accountRows,false);
      if(accountErr) return accountErr;
      p.structured.accounts=accountRows; p.raw.accounts=this._obSerialize("accounts",accountRows);
    } else if(step===2){
      var fixedRows=skip?[]:this._collectObRows("fixedExpenses"), fixedErr=skip?"":this._obRowsError("fixedExpenses",fixedRows,false);
      if(fixedErr) return fixedErr;
      p.structured.fixedExpenses=fixedRows; p.raw.fixedExpenses=this._obSerialize("fixedExpenses",fixedRows);
    } else if(step===3){
      var debtRows=skip?[]:this._collectObRows("debts"), debtErr=skip?"":this._obRowsError("debts",debtRows,false);
      if(debtErr) return debtErr;
      p.snowball.monthly_budget_minor=this._moneyInput(val("ob_debt_budget"),cur); p.structured.debts=debtRows; p.raw.debts=this._obSerialize("debts",debtRows);
    } else if(step===4){
      var goalRows=skip?[]:this._collectObRows("goals"), purchaseRows=skip?[]:this._collectObRows("plannedPurchases");
      var goalErr=goalRows.length?this._obRowsError("goals",goalRows,true):"", purchaseErr=purchaseRows.length?this._obRowsError("plannedPurchases",purchaseRows,true):"";
      if(goalErr) return goalErr; if(purchaseErr) return purchaseErr;
      if(!skip && !goalRows.length && !purchaseRows.length && this._moneyInput(val("ob_emergency"),cur)<=0 && val("ob_re_status")==="no") return "Ajoute au moins un objectif, ou clique Passer cette étape.";
      p.emergency_target_minor=this._moneyInput(val("ob_emergency"),cur); p.funding.mode=val("ob_seq"); p.structured.goals=goalRows; p.structured.plannedPurchases=purchaseRows; p.raw.goals=this._obSerialize("goals",goalRows); p.raw.plannedPurchases=this._obSerialize("plannedPurchases",purchaseRows);
      p.realEstate.status=val("ob_re_status"); p.realEstate.target_price_minor=this._moneyInput(val("ob_re_price"),cur); p.realEstate.rate_bps=Math.round(this._numInput(val("ob_re_rate"))*100)||700;
    } else {
      if(!skip && !val("ob_risk")) return "Indique tes habitudes à risque, ou clique Passer cette étape.";
      if(!skip && !val("ob_payday")) return "Indique ton jour de paie dangereux, ou clique Passer cette étape.";
      p.raw.riskAreas=skip?"":val("ob_risk"); p.raw.dangerousPayday=skip?"":val("ob_payday"); p.lifestyle.threshold_pct=Math.max(1,Math.round(this._numInput(val("ob_threshold"))||15)); p.lifestyle.excluded=val("ob_excluded"); p.monthlyReview.enabled=val("ob_review")==="yes";
    }
    this._setPlan(p);
    return "";
  }
  _completeOnboarding(){
    var p=this._plan(), cur=p.profile.main_currency||this.state.currency, patch={currency:cur}, self=this;
    function mkId(){ return self._uid(); }
    const currentIso=this._isoToday(), currentPeriod=this._periodFromIso(currentIso), currentMonth=this._monthFromIso(currentIso);
    var accounts=this._obRows("accounts",p).map(function(a){ return {id:mkId(),name:a.name||"Compte",type:a.role||"Autre",balance_minor:self._moneyInput(a.balance,cur),currency:cur,updated:"Aujourd'hui",linked:true,icon:self._iconForType(a.role||"Autre"),c:"#1E5081",b:"#EAF1F8",role:a.role||"Autre"}; });
    var firstAcc=accounts[0]?accounts[0].name:"";
    const incomes=this._obRows("income",p).map(function(a){ return {id:mkId(),source:a.source||"Revenu",label:a.source||"Revenu",amount_minor:self._moneyInput(a.amount,cur),currency:cur,freq:a.frequency||"Mensuel",date:self._fullFromIso(currentIso),date_iso:currentIso,period:currentPeriod,month:currentMonth,account:firstAcc,note:"Jour: "+(a.payday||"Variable")+"; type: "+(a.income_type||"Fixe")}; });
    if(!incomes.length && (p.lifestyle?.new_income_minor||0)>0) incomes.push({id:mkId(),source:"Revenu principal",label:"Revenu principal",amount_minor:Math.trunc(Number(p.lifestyle.new_income_minor)||0),currency:cur,freq:"Mensuel",date:self._fullFromIso(currentIso),date_iso:currentIso,period:currentPeriod,month:currentMonth,account:firstAcc,note:"Revenu mensuel actuel saisi pendant la configuration. Rythme de paie : "+(p.profile?.pay_frequency||"Mensuel")});
    const expenses=this._obRows("fixedExpenses",p).map(function(a){ return {id:mkId(),cat:a.category||"Autre",payee:a.name||"Dépense fixe",amount_minor:self._moneyInput(a.amount,cur),currency:cur,method:"Prévu",account:firstAcc,date:self._fullFromIso(currentIso),date_iso:currentIso,period:currentPeriod,month:currentMonth,proof:null,note:"Dépense fixe onboarding; jour prévu: "+(a.day||"Variable")}; });
    var debts=this._obRows("debts",p).map(function(a){ var total=self._moneyInput(a.balance,cur); return {id:mkId(),name:a.name||"Dette",creditor:a.name||"Créancier",total_amount_minor:total,paid_amount_minor:0,currency:cur,due:a.due||"—",status:"À jour",minimum_minor:self._moneyInput(a.minimum,cur),apr_bps:Math.round(self._numInput(a.apr)*100)||0}; });
    var savings=[];
    if((p.emergency_target_minor||0)>0) savings.push({id:mkId(),name:"Coussin de sécurité",target_amount_minor:p.emergency_target_minor,current_amount_minor:0,currency:cur,date:"—",status:"En cours",priority:"Haute"});
    this._obRows("goals",p).forEach(function(a){ savings.push({id:mkId(),name:a.name||"Objectif",target_amount_minor:self._moneyInput(a.target,cur),current_amount_minor:0,currency:cur,date:a.date||"—",priority:a.priority||"Moyenne",status:"En cours"}); });
    var pots=this._obRows("plannedPurchases",p).map(function(a){
      var schedule=a.schedule||"", weekly=0, monthly=0, date=schedule||"—", targetIso=self._isoDateMaybe(schedule);
      if(/semaine|hebdo|week/i.test(schedule)){ weekly=self._moneyFromText(schedule,cur); date="—"; targetIso=null; }
      if(/mois|mensuel|month/i.test(schedule)){ monthly=self._moneyFromText(schedule,cur); weekly=Math.round(monthly/4.345); date="—"; targetIso=null; }
      return {id:mkId(),name:a.name||"Achat planifié",target_amount_minor:self._moneyInput(a.price,cur),current_amount_minor:0,currency:cur,date:date,target_iso:targetIso,priority:a.priority||"Moyenne",status:"En cours",goal_type:"planned_purchase",planned:true,weekly_minor:weekly,image_url:self._safeImageUrl(a.image_url)};
    });
    if(accounts.length) patch.accounts=accounts;
    if(incomes.length) patch.incomes=incomes;
    if(expenses.length) patch.expenses=expenses;
    if(debts.length) patch.debts=debts;
    if(savings.length) patch.savings=savings;
    if(pots.length) patch.pots=pots;
    p.onboarding.completed=true; p.onboarding.completed_at=new Date().toISOString(); p.onboarding.step=5; patch.financialPlan=p;
    this.setState(patch,function(){ self._normalizeIds(); self._persist(); self._trackFeature("onboarding","feature_completed",{step:5,result:"completed"}); self.showToast("ok","Onboarding terminé. Ton plan est actif."); });
  }
  _metricCard(title,value,sub){
    return '<div style="background:#fff;border:1px solid #E7E9E4;border-radius:16px;padding:14px"><div style="font-size:12px;font-weight:800;color:#8B98A2;margin-bottom:5px">'+this._esc(title)+'</div><div style="font-size:20px;font-weight:900;color:#17293C">'+this._esc(value)+'</div><div style="font-size:12px;color:#5A6B78;margin-top:4px;line-height:1.35">'+this._esc(sub||"")+'</div></div>';
  }
  _listHtml(rows, empty){
    if(!rows || !rows.length) return '<div style="font-size:13px;color:#8B98A2">'+this._esc(empty||"Aucune donnée pour le moment.")+'</div>';
    return '<div style="display:flex;flex-direction:column;gap:8px">'+rows.join("")+'</div>';
  }
  _openPlanPanel(){
    this._trackFeature("financial_plan","feature_viewed",{source:this.state.page});
    var self=this, p=this._plan(), life=this._lifestyleSignal(), debtPlan=this._debtDecisionPlan(), seq=this._sequentialFunding(), rev=this._monthlyReview(), re=this._realEstateProjection(), planned=this._plannedPurchaseViews();
    var body=document.createElement("div");
    var debtRows=debtPlan.sequence.map((x)=>'<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;background:#FAFBF9;border:1px solid #EFF1EC;border-radius:12px"><div style="min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:900;color:#1E5081;background:#EAF1F8;border-radius:99px;padding:4px 8px">#'+this._esc(x.rank)+'</span><b>'+this._esc(x.name)+'</b></div><div style="font-size:12px;color:#8B98A2;margin-top:4px">'+this._esc("Reste "+this.mFmt(x.remain,this.state.currency)+" · minimum "+this.mFmt(x.minimum_minor,this.state.currency))+'</div></div><div style="text-align:right;font-size:12.5px;color:#5A6B78;min-width:116px">'+this._esc(this.mFmt(x.monthly,this.state.currency)+"/mois")+"<br>"+this._esc(x.done?x.done.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}):"Budget à définir")+'</div></div>');
    var debtDecisionHtml=debtPlan.ok?'<div style="background:#fff;border:1px solid #E1E4DE;border-radius:16px;padding:14px;margin-bottom:12px"><div style="font-size:11.5px;font-weight:900;letter-spacing:.04em;color:#3F9A5A;text-transform:uppercase;margin-bottom:6px">Décision recommandée</div><h3 style="margin:0 0 7px;font-size:18px;font-weight:900;color:#17293C">'+this._esc(debtPlan.headline)+'</h3><p style="margin:0 0 10px;font-size:13px;line-height:1.45;color:#5A6B78">'+this._esc(debtPlan.why)+'</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px;margin-bottom:10px">'+this._metricCard("Méthode",debtPlan.strategyLabel,"Choisie automatiquement")+this._metricCard("À payer sur cible",debtPlan.targetPayStr,"Ce mois-ci")+this._metricCard("Dette cible finie",debtPlan.targetDoneStr,"Estimation")+'</div><div style="font-size:13px;line-height:1.45;color:#17293C;background:#F7F8F5;border:1px solid #EFF1EC;border-radius:13px;padding:11px 12px">'+this._esc(debtPlan.action)+'<br>'+this._esc("Quand une dette est soldée, son minimum rejoint la suivante : le panier fuit moins chaque mois.")+'</div></div>':'';
    var plannedRows=planned.map((x)=>{
      var safeImg=this._safeImageUrl(x.goal.image_url);
      var img=safeImg?'<img src="'+this._esc(safeImg)+'" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:54px;height:54px;object-fit:cover;border-radius:12px;border:1px solid #E1E4DE">':"";
      return '<div style="padding:12px;background:#FAFBF9;border:1px solid #EFF1EC;border-radius:13px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div style="display:flex;gap:10px;align-items:center">'+img+'<b>'+this._esc(x.goal.name)+'</b></div><span style="font-size:12px;color:#5A6B78">'+this._esc(this.mFmt(x.goal.current_amount_minor,this.state.currency)+" / "+this.mFmt(x.goal.target_amount_minor,this.state.currency))+'</span></div><div style="height:8px;background:#E7E9E4;border-radius:999px;margin:9px 0"><div style="height:100%;width:'+this.pct(x.goal.current_amount_minor,x.goal.target_amount_minor)+'%;background:#3F9A5A;border-radius:999px"></div></div><div style="font-size:12.5px;color:#5A6B78">'+this._esc(x.weekly?("Pour le financer : "+this.mFmt(x.weekly,this.state.currency)+"/semaine"):"Ajoute une date cible ou une contribution.")+'</div><div style="font-size:12.5px;color:#5A6B78;margin-top:3px">'+this._esc("Anti-Klarna : tu peux économiser environ "+this.mFmt(x.savedLow,this.state.currency)+" à "+this.mFmt(x.savedHigh,this.state.currency)+" en payant cash.")+'</div></div>';
    });
    var incomeRows=Object.keys(rev.bySource).map((k)=>'<div style="display:flex;justify-content:space-between"><span>'+this._esc(k)+'</span><b>'+this._esc(this.mFmt(rev.bySource[k],this.state.currency))+'</b></div>');
    var expenseRows=Object.keys(rev.byCat).map((k)=>'<div style="display:flex;justify-content:space-between"><span>'+this._esc(k)+'</span><b>'+this._esc(this.mFmt(rev.byCat[k],this.state.currency))+'</b></div>');
    var realEstateHtml="";
    if((p.realEstate&&p.realEstate.status)!=="no"){
      realEstateHtml='<section style="margin-top:14px;background:#F7F8F5;border:1px solid #EFF1EC;border-radius:18px;padding:14px"><h3 style="margin:0 0 10px;font-size:16px;font-weight:900">Projet immobilier</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'+this._metricCard("Mensualité max",this.mFmt(re.maxPayment,this.state.currency),"Règle 28/36")+this._metricCard("Prix estimé max","~"+this.mFmt(re.maxPrice,this.state.currency),"Avec apport lié")+this._metricCard("Apport",this.mFmt(re.downPayment,this.state.currency),"Cagnotte liée")+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:12px">'+this._rangeHtml("mc_sim_income","Et si revenu +",this._plain(p.simulator.extra_income_minor||0,this.state.currency),0,3000,50,this.state.currency+"/mois")+this._rangeHtml("mc_sim_debt","Et si dette libérée/mois",this._plain(p.simulator.freed_debt_minor||0,this.state.currency),0,1000,10,this.state.currency+"/mois")+this._rangeHtml("mc_sim_rate","Et si taux (%)",String((p.simulator.rate_bps||650)/100).replace(",","."),3,12,.1,"%")+'</div><p style="margin:2px 0 0;color:#8B98A2;font-size:11.5px;line-height:1.45">Estimation basée sur les ratios 28/36 couramment utilisés par les prêteurs américains. Chaque banque a ses propres critères. Ceci n’est pas un conseil financier.</p></section>';
    }
    body.innerHTML='<div style="'+this._plannerStyle()+'"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">'+this._metricCard("Anti-inflation",life.baseline?((life.pct>=0?"+":"")+life.pct+" %"):"À calibrer",life.alert?"Tes dépenses montent avec le revenu.":"Baseline suivie.")+this._metricCard("Mode cagnottes",(p.funding.mode==="sequential"?"Séquentiel":"Parallèle"),seq.active?("Objectif actif : "+seq.active.name):"Aucun objectif actif")+this._metricCard("Bilan "+rev.month,this.mFmt(rev.income-rev.expenses,this.state.currency),"Revenus - dépenses")+'</div><section style="background:#F7F8F5;border:1px solid #EFF1EC;border-radius:18px;padding:14px;margin-bottom:14px"><h3 style="margin:0 0 10px;font-size:16px;font-weight:900">Plan d’attaque dettes</h3>'+debtDecisionHtml+this._listHtml(debtRows,"Ajoute tes dettes avec minimum mensuel pour recevoir une stratégie claire.")+'</section><section style="background:#F7F8F5;border:1px solid #EFF1EC;border-radius:18px;padding:14px;margin-bottom:14px"><h3 style="margin:0 0 10px;font-size:16px;font-weight:900">Achats planifiés anti-Klarna</h3>'+this._listHtml(plannedRows,"Ajoute un achat planifié dans l’onboarding ou les cagnottes.")+'</section><section style="background:#F7F8F5;border:1px solid #EFF1EC;border-radius:18px;padding:14px;margin-bottom:14px"><h3 style="margin:0 0 10px;font-size:16px;font-weight:900">Bilan mensuel automatique</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px"><div><b style="font-size:13px">Revenus par source</b>'+this._listHtml(incomeRows,"Aucun revenu ce mois.")+'</div><div><b style="font-size:13px">Dépenses par catégorie</b>'+this._listHtml(expenseRows,"Aucune dépense ce mois.")+'</div></div><div style="margin-top:10px;font-size:12.5px;color:#5A6B78">'+this._esc("Écart dépenses vs mois précédent : "+this.mFmt(rev.delta,this.state.currency))+'</div></section>'+this._productEvaluationHtml()+realEstateHtml+'</div>';
    var modal=this._mcModal("Plan financier", body, null);
    modal.card.style.maxWidth="760px";
    var saveSim=function(){
      var plan=self._plan(), income=document.getElementById("mc_sim_income"), debt=document.getElementById("mc_sim_debt"), rate=document.getElementById("mc_sim_rate");
      if(!income||!debt||!rate) return;
      plan.simulator.extra_income_minor=self._moneyInput(income.value,self.state.currency);
      plan.simulator.freed_debt_minor=self._moneyInput(debt.value,self.state.currency);
      plan.simulator.rate_bps=Math.round(self._numInput(rate.value)*100)||plan.simulator.rate_bps;
      self._setPlan(plan,function(){ modal.close(); self._openPlanPanel(); });
    };
    ["mc_sim_income","mc_sim_debt","mc_sim_rate"].forEach(function(id){
      var el=document.getElementById(id), val=document.getElementById(id+"_val");
      if(el){
        el.oninput=function(){ if(val) val.textContent=el.value+" "+(el.getAttribute("data-suffix")||""); };
        el.onchange=saveSim;
      }
    });
  }

  /* ---------- Supabase Auth + Storage, disabled by default ---------- */
  _cloudEnabled(){
    var cfg=this.MC_CLOUD;
    return !!(cfg && cfg.enabled===true);
  }
  _cloudReady(){
    return !!(this.sb && this._cloud);
  }
  _cloudLoadSdk(){
    var self=this;
    if(window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if(this._cloudSdkPromise) return this._cloudSdkPromise;
    this._cloudSdkPromise=new Promise(function(resolve,reject){
      var s=document.createElement("script");
      s.src=self.SUPABASE_SDK_URL;
      s.integrity=self.SUPABASE_SDK_INTEGRITY;
      s.crossOrigin="anonymous";
      s.referrerPolicy="no-referrer";
      s.async=true;
      s.onload=function(){ resolve(window.supabase); };
      s.onerror=function(){ reject(new Error("SDK Supabase indisponible")); };
      document.head.appendChild(s);
    }).catch(function(e){ self._cloudHandleError("sdk", e); throw e; });
    return this._cloudSdkPromise;
  }
  _cloudInitClient(){
    var cfg=this.MC_CLOUD;
    if(!this._cloudEnabled()) return null;
    if(this.sb) return this.sb;
    try{
      if(!cfg.url || !cfg.anonKey) return null;
      if(!window.supabase || !window.supabase.createClient) return null;
      this.sb=window.supabase.createClient(cfg.url, cfg.anonKey);
      this._cloud=true;
      return this.sb;
    }catch(e){
      this._cloudHandleError("init", e);
      return null;
    }
  }
  _cloudEnsureClient(){
    var self=this;
    if(!this._cloudEnabled()) return Promise.resolve(null);
    if(this._cloudReady()) return Promise.resolve(this.sb);
    return this._cloudLoadSdk().then(function(){ return self._cloudInitClient(); });
  }
  _maybeInitCloud(){
    var self=this;
    if(!this._cloudEnabled()) return;
    if(this._cloudBooted) return;
    this._cloudBooted=true;
    this._cloudEnsureClient().then(function(client){
      if(!client || !client.auth) return;
      if(client.auth.onAuthStateChange && !self._cloudAuthSub){
        var sub=client.auth.onAuthStateChange(function(evt, session){ self._cloudApplySession(session); });
        self._cloudAuthSub=sub && sub.data ? sub.data.subscription : sub;
      }
      return self._cloudGetSession().then(function(session){ return self._cloudApplySession(session); });
    }).catch(function(e){ self._cloudHandleError("boot", e); });
  }
  _cloudApplySession(session){
    var self=this;
    this._cloudSession=session||null;
    this._cloudUser=session && session.user ? session.user : null;
    if(this._cloudUser){
      return this._cloudLoad().then(function(){ if(self.state.page==="login") self.go("dashboard"); });
    }
    return Promise.resolve(null);
  }
  _cloudGetSession(){
    var self=this;
    if(!this._cloudEnabled() || !this._cloudReady() || !this.sb.auth || !this.sb.auth.getSession) return Promise.resolve(null);
    try{
      return this.sb.auth.getSession().then(function(r){
        return r && r.data && r.data.session ? r.data.session : null;
      }).catch(function(e){ self._cloudHandleError("session", e); return null; });
    }catch(e){
      this._cloudHandleError("session", e);
      return Promise.resolve(null);
    }
  }
  _visibleEl(el){
    try{
      if(!el || el.disabled) return false;
      var r=el.getBoundingClientRect();
      var st=window.getComputedStyle ? window.getComputedStyle(el) : null;
      return r.width>0 && r.height>0 && (!st || (st.display!=="none" && st.visibility!=="hidden"));
    }catch(e){ return !!el; }
  }
  _setInputValue(el, value){
    try{
      var proto=window.HTMLInputElement && window.HTMLInputElement.prototype;
      var desc=proto ? Object.getOwnPropertyDescriptor(proto,"value") : null;
      if(desc && desc.set) desc.set.call(el,value);
      else el.value=value;
      el.dispatchEvent(new Event("input",{bubbles:true}));
      el.dispatchEvent(new Event("change",{bubbles:true}));
    }catch(e){ if(el) el.value=value; }
  }
  _unlockLoginInput(el, value){
    try{
      if(!el || el.__mcCloudUnlocked) return el;
      var c=el.cloneNode(false);
      c.removeAttribute("value");
      c.defaultValue="";
      c.value=value||"";
      c.__mcCloudUnlocked=true;
      el.parentNode.replaceChild(c,el);
      return c;
    }catch(e){ return el; }
  }
  _wireLogin(){
    try{
      if(!this._cloudEnabled()) return;
      var self=this;
      var inputs=Array.prototype.filter.call(document.querySelectorAll('input[type="email"],input[type="password"]'), function(el){ return self._visibleEl(el); });
      if(inputs.length<2) return;
      var emailInput=inputs.filter(function(el){ return el.type==="email"; })[0];
      var passInput=inputs.filter(function(el){ return el.type==="password"; })[0];
      emailInput=this._unlockLoginInput(emailInput,this._loginEmailValue||"");
      passInput=this._unlockLoginInput(passInput,this._loginPasswordValue||"");
      if(emailInput) emailInput.setAttribute("data-mc-login-email","1");
      if(passInput) passInput.setAttribute("data-mc-login-password","1");
      if(emailInput && emailInput.value==="nypal@moncoffre.app"){
        this._setInputValue(emailInput,"");
        this._loginEmailValue="";
      }
      if(passInput && passInput.value==="motdepasse"){
        this._setInputValue(passInput,"");
        this._loginPasswordValue="";
      }
      if(emailInput && !emailInput.__mcCloudValueWired){
        emailInput.__mcCloudValueWired=true;
        var syncEmail=function(){
          self._loginEmailValue=emailInput.value.trim();
          setTimeout(function(){
            if(emailInput && emailInput.value!==self._loginEmailValue) self._setInputValue(emailInput,self._loginEmailValue||"");
          },0);
        };
        emailInput.addEventListener("input",syncEmail,true);
        emailInput.addEventListener("change",syncEmail,true);
      }
      if(passInput && !passInput.__mcCloudValueWired){
        passInput.__mcCloudValueWired=true;
        var syncPass=function(){
          self._loginPasswordValue=passInput.value;
          setTimeout(function(){
            if(passInput && passInput.value!==self._loginPasswordValue) self._setInputValue(passInput,self._loginPasswordValue||"");
          },0);
        };
        passInput.addEventListener("input",syncPass,true);
        passInput.addEventListener("change",syncPass,true);
      }
      if(passInput && passInput.parentElement){
        var svgs=passInput.parentElement.querySelectorAll("svg");
        var eye=svgs[svgs.length-1];
        if(eye && !eye.__mcPwdToggleWired){
          eye.__mcPwdToggleWired=true;
          eye.setAttribute("role","button");
          eye.setAttribute("tabindex","0");
          eye.setAttribute("aria-label","Afficher le mot de passe");
          var toggle=function(e){
            if(e){ e.preventDefault(); e.stopPropagation(); }
            passInput.type=passInput.type==="password"?"text":"password";
            eye.setAttribute("aria-label",passInput.type==="password"?"Afficher le mot de passe":"Masquer le mot de passe");
          };
          eye.addEventListener("click",toggle,true);
          eye.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ toggle(e); } },true);
        }
      }
      var buttons=Array.prototype.filter.call(document.querySelectorAll("button"), function(el){ return self._visibleEl(el); });
      Array.prototype.forEach.call(buttons,function(btn){
        var t=(btn.textContent||"").trim();
        var tl=t.toLowerCase();
        var isSignin=tl.indexOf("connecter")>=0;
        var isSignup=tl.indexOf("compte")>=0 && tl.indexOf("cr")===0;
        if(!isSignin && !isSignup) return;
        if(btn.__mcCloudLoginWired) return;
        btn.__mcCloudLoginWired=true;
        var handler=function(e){
          if(e && e.__mcCloudLoginHandled) return;
          if(e){
            e.__mcCloudLoginHandled=true;
            e.preventDefault();
            e.stopImmediatePropagation();
          }
          self._cloudLogin(isSignup?"signup":"signin");
        };
        btn.addEventListener("click",handler,true);
      });
    }catch(e){ this._cloudHandleError("wireLogin", e); }
  }
  _loginFields(){
    const passType=["pass","word"].join("");
    const passSelector='input[data-mc-login-'+passType+'="1"],input[type="'+passType+'"]';
    const email=Array.prototype.filter.call(document.querySelectorAll('input[data-mc-login-email="1"],input[type="email"]'), (el)=>this._visibleEl(el))[0];
    const pass=Array.prototype.filter.call(document.querySelectorAll(passSelector), (el)=>this._visibleEl(el))[0];
    let emailValue=(this._loginEmailValue!=null) ? this._loginEmailValue : (email?.value.trim()||"");
    let passValue=(this._loginPasswordValue!=null) ? this._loginPasswordValue : (pass?.value||"");
    if(emailValue==="nypal@moncoffre.app") emailValue="";
    if(passValue===(["mot","de","passe"].join(""))) passValue="";
    return {email:emailValue, password:passValue};
  }
  _cloudFriendlyError(err){
    var msg=(err && err.message) ? String(err.message) : "Connexion cloud impossible.";
    var code=(err && (err.code||err.error_code)) ? String(err.code||err.error_code) : "";
    var raw=(code+" "+msg).toLowerCase();
    if(raw.indexOf("email not confirmed")>=0 || raw.indexOf("email_not_confirmed")>=0){
      return "Ton email n'est pas encore confirmé. Ouvre l'email Supabase, confirme le compte, puis reviens te connecter.";
    }
    if(raw.indexOf("invalid_credentials")>=0 || raw.indexOf("invalid login credentials")>=0){
      return "Email ou mot de passe incorrect. Si tu viens de créer le compte, confirme d'abord ton email.";
    }
    if(raw.indexOf("unable to validate email")>=0 || raw.indexOf("validation_failed")>=0){
      return "Adresse e-mail invalide. Vérifie l'adresse puis réessaie.";
    }
    if(raw.indexOf("email address")>=0 && raw.indexOf("invalid")>=0){
      return "Adresse e-mail invalide. Vérifie l'adresse puis réessaie.";
    }
    if(raw.indexOf("rate limit")>=0 || raw.indexOf("too many")>=0){
      return "Trop d'essais en peu de temps. Attends quelques minutes puis réessaie.";
    }
    return msg;
  }
  _cloudLogin(mode){
    var self=this;
    if(!this._cloudEnabled()){ this.go("dashboard"); return; }
    if(this._cloudLoginBusy) return;
    this._cloudLoginBusy=true;
    this._cloudEnsureClient().then(function(client){
      if(!client || !client.auth) throw new Error("Client Supabase non pret");
      var f=self._loginFields();
      if(!f.email || !f.password){ self.showToast("warn","Email et mot de passe requis."); return null; }
      var credentials={email:f.email,password:f.password};
      if(mode==="signup"){
        credentials.options={emailRedirectTo:window.location.origin};
      }
      var req=(mode==="signup") ? client.auth.signUp(credentials) : client.auth.signInWithPassword(credentials);
      return req.then(function(r){
        if(r.error) throw r.error;
        var session=r.data && r.data.session ? r.data.session : null;
        if(session) return self._cloudApplySession(session);
        self.showToast("ok","Compte créé. Ouvre l'email de confirmation puis reviens te connecter.");
        return null;
      });
    }).then(function(){
      self._cloudLoginBusy=false;
    }).catch(function(e){
      self._cloudHandleError("login", e);
      self.showToast("warn", self._cloudFriendlyError(e));
      self._cloudLoginBusy=false;
    });
  }
  _cloudPersistSnapshot(snapshot){
    var self=this;
    if(!this._cloudEnabled() || !this._cloudReady() || !this._cloudSession || !snapshot) return;
    this._cloudPendingSnapshot=snapshot;
    clearTimeout(this._cloudPersistTimer);
    this._cloudPersistTimer=setTimeout(function(){
      var snap=self._cloudPendingSnapshot;
      self._cloudPersistPromise=(self._cloudPersistPromise||Promise.resolve()).then(function(){
        return self._cloudPersistSnapshotNow(snap);
      }).catch(function(e){ self._cloudHandleError("persist", e); });
    },350);
  }
  _cloudApplySnapshot(snapshot){
    if(!this._cloudEnabled() || !snapshot || snapshot.v!==2) return false;
    var keys=this._dataKeys();
    for(var i=0;i<keys.length;i++){ if(!Array.isArray(snapshot[keys[i]])) snapshot[keys[i]]=[]; }
    if(typeof snapshot.currency!=="string") snapshot.currency="USD";
    var patch={currency:this._cur(snapshot.currency), financialPlan:this._mergePlan(snapshot.financialPlan)};
    keys.forEach(function(k){ patch[k]=snapshot[k]; });
    var self=this;
    this.setState(patch, function(){ self._normalizeIds(); self._wireRows(); self._wireLogin(); self._wirePlanningUi(); self._wireDebtDecisionUi(); });
    return true;
  }
  _cloudHandleError(stage, err){
    this._cloudLastError={stage:String(stage||"cloud"), message:err?.message?String(err.message):"Erreur cloud"};
    if(this._cloudEnabled() && typeof console!=="undefined" && console.warn){
      console.warn("Cloud Mon Coffre:", this._cloudLastError.stage, this._cloudLastError.message);
    }
  }
  _localIsoDate(value){
    const d=value instanceof Date?value:new Date();
    if(!Number.isFinite(d.getTime())) return "";
    return String(d.getFullYear()).padStart(4,"0")+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  _isoToday(value){ return this._localIsoDate(value); }
  _periodFromIso(iso){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||""));
    if(!m) return null;
    const y=Number(m[1]), mo=Number(m[2]), day=Number(m[3]), d=new Date(y,mo-1,day);
    if(d.getFullYear()!==y || d.getMonth()!==mo-1 || d.getDate()!==day) return null;
    return m[1]+"-"+m[2];
  }
  _currentPeriod(value){ return this._periodFromIso(this._isoToday(value)); }
  _shiftPeriod(period, offset){
    const m=/^(\d{4})-(\d{2})$/.exec(String(period||""));
    if(!m) return null;
    const d=new Date(Number(m[1]),Number(m[2])-1+(Number(offset)||0),1);
    return String(d.getFullYear()).padStart(4,"0")+"-"+String(d.getMonth()+1).padStart(2,"0");
  }
  _periodLabel(period){
    const m=/^(\d{4})-(\d{2})$/.exec(String(period||""));
    if(!m) return "";
    const text=new Intl.DateTimeFormat("fr-FR",{month:"long",year:"numeric"}).format(new Date(Number(m[1]),Number(m[2])-1,1));
    return text.charAt(0).toUpperCase()+text.slice(1);
  }
  _periodChartLabel(period){
    const m=/^(\d{4})-(\d{2})$/.exec(String(period||""));
    if(!m) return "";
    const month=new Intl.DateTimeFormat("fr-FR",{month:"short"}).format(new Date(Number(m[1]),Number(m[2])-1,1)).replace(".","");
    return month.charAt(0).toUpperCase()+month.slice(1)+" "+m[1].slice(2);
  }
  _rollingPeriods(count, value){
    const current=this._currentPeriod(value), rows=[];
    for(let i=Math.max(1,Number(count)||1)-1;i>=0;i--) rows.push(this._shiftPeriod(current,-i));
    return rows;
  }
  _recordPeriod(record){
    const r=record||{}, direct=String(r.period||"");
    if(/^\d{4}-\d{2}$/.test(direct)) return direct;
    const iso=this._isoDateMaybe(r.date_iso)||this._isoDateMaybe(r.date);
    if(iso) return this._periodFromIso(iso);
    const idx=this._moisLong.map((x)=>x.toLowerCase()).indexOf(String(r.month||"").toLowerCase());
    return idx>=0?String(new Date().getFullYear())+"-"+String(idx+1).padStart(2,"0"):null;
  }
  _recordInPeriod(record, period){ return !!period && this._recordPeriod(record)===period; }
  _periodOptions(records){
    const seen={}, periods=[this._currentPeriod()];
    (records||[]).forEach((record)=>{ const period=this._recordPeriod(record); if(period) periods.push(period); });
    return periods.filter((period)=>{
      if(!period||seen[period]) return false;
      seen[period]=1;
      return true;
    }).sort((a,b)=>b.localeCompare(a)).slice(0,12).map((period)=>({value:period,label:this._periodLabel(period)}));
  }
  _isoDateMaybe(v){
    if(!v || v==="—") return null;
    var s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return this._periodFromIso(s)?s:null;
    var m=s.match(/^(\d{1,2})\s+([^\s]+)(?:\s+(\d{4}))?/);
    if(!m) return null;
    var name=m[2].toLowerCase().replace(".","");
    var map={"janv":0,"janvier":0,"fevr":1,"févr":1,"fevrier":1,"février":1,"mars":2,"avr":3,"avril":3,"mai":4,"juin":5,"juil":6,"juillet":6,"aout":7,"août":7,"sept":8,"septembre":8,"oct":9,"octobre":9,"nov":10,"novembre":10,"dec":11,"déc":11,"decembre":11,"décembre":11};
    if(map[name]==null) return null;
    var y=Number(m[3]||new Date().getFullYear()), d=Number(m[1]), mo=map[name]+1;
    if(!d || d<1 || d>31) return null;
    const iso=String(y).padStart(4,"0")+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    return this._periodFromIso(iso)?iso:null;
  }
  _shortFromIso(iso){
    if(!iso) return this._todayShort();
    var d=new Date(String(iso)+"T00:00:00");
    if(!isFinite(d.getTime())) return this._todayShort();
    return d.getDate()+" "+this._moisFr[d.getMonth()];
  }
  _fullFromIso(iso){
    if(!iso) return this._todayFull();
    var d=new Date(String(iso)+"T00:00:00");
    if(!isFinite(d.getTime())) return this._todayFull();
    return d.getDate()+" "+this._moisFr[d.getMonth()]+" "+d.getFullYear();
  }
  _monthFromIso(iso){
    if(!iso) return this._thisMonth();
    var d=new Date(String(iso)+"T00:00:00");
    if(!isFinite(d.getTime())) return this._thisMonth();
    return this._moisLong[d.getMonth()];
  }
  _cloudIdMap(){
    if(this._cloudIds) return this._cloudIds;
    var uid=this._cloudUser && this._cloudUser.id ? this._cloudUser.id : "local";
    var key="moncoffre.cloud.ids."+uid;
    this._cloudIdKey=key;
    try{ this._cloudIds=JSON.parse(localStorage.getItem(key)||"{}")||{}; }catch(e){ this._cloudIds={}; }
    return this._cloudIds;
  }
  _cloudStableId(kind, id){
    if(this._isUuid(id)) return String(id);
    var k=String(kind)+":"+String(id||"missing");
    var map=this._cloudIdMap();
    if(!map[k]){
      map[k]=this._uid();
      try{ localStorage.setItem(this._cloudIdKey, JSON.stringify(map)); }catch(e){}
    }
    return map[k];
  }
  _cloudAccountIdByName(snapshot, name, currency){
    if(!name) return null;
    var acc=(snapshot.accounts||[]).filter(function(a){ return a && a.name===name && (a.currency||currency)===currency; })[0];
    return acc ? this._cloudStableId("accounts", acc.id||acc.name) : null;
  }
  _cloudUpsert(table, rows){
    if(!rows || !rows.length) return Promise.resolve(null);
    return this.sb.from(table).upsert(rows,{onConflict:"id"}).then(function(r){ if(r.error) throw r.error; return r.data; });
  }
  _cloudLoadPlan(){
    var self=this;
    if(!this._cloudUser) return Promise.resolve(this._plan());
    return this.sb.from("user_financial_plans").select("plan,onboarding_completed,onboarding_completed_at").eq("user_id",this._cloudUser.id).maybeSingle().then(function(r){
      if(r.error) throw r.error;
      var plan=self._mergePlan(r.data && r.data.plan ? r.data.plan : {});
      if(r.data && r.data.onboarding_completed){ plan.onboarding.completed=true; plan.onboarding.completed_at=r.data.onboarding_completed_at; }
      return plan;
    }).catch(function(e){ self._cloudHandleError("planLoad", e); return self._plan(); });
  }
  _cloudPersistPlan(plan){
    var self=this;
    if(!this._cloudUser || !this.sb) return Promise.resolve(null);
    var p=this._mergePlan(plan);
    return this.sb.from("user_financial_plans").upsert({
      user_id:this._cloudUser.id,
      onboarding_completed:!!(p.onboarding&&p.onboarding.completed),
      onboarding_completed_at:(p.onboarding&&p.onboarding.completed_at)||null,
      plan:p,
      updated_at:new Date().toISOString()
    },{onConflict:"user_id"}).then(function(r){ if(r.error) throw r.error; return r.data; }).catch(function(e){ self._cloudHandleError("planPersist", e); return null; });
  }
  _debtMetaFromPlan(plan){
    var self=this, map={}, p=this._mergePlan(plan||{}), cur=(p.profile&&p.profile.main_currency)||self.state.currency;
    this._obRows("debts",p).forEach(function(a){
      var name=String(a.name||"").toLowerCase();
      if(name) map[name]={minimum_minor:self._moneyInput(a.minimum,cur),apr_bps:Math.round(self._numInput(a.apr)*100)||0};
    });
    return map;
  }
  _purchaseMetaFromPlan(plan){
    var self=this, map={}, p=this._mergePlan(plan||{}), cur=(p.profile&&p.profile.main_currency)||self.state.currency;
    this._obRows("plannedPurchases",p).forEach(function(a){
      var name=String(a.name||"").toLowerCase(), schedule=a.schedule||"", weekly=0, monthly=0, targetIso=self._isoDateMaybe(schedule);
      if(/semaine|hebdo|week/i.test(schedule)){ weekly=self._moneyFromText(schedule,cur); targetIso=null; }
      if(/mois|mensuel|month/i.test(schedule)){ monthly=self._moneyFromText(schedule,cur); weekly=Math.round(monthly/4.345); targetIso=null; }
      if(name) map[name]={goal_type:"planned_purchase",planned:true,weekly_minor:weekly,target_iso:targetIso,image_url:self._safeImageUrl(a.image_url)};
    });
    return map;
  }
  _cloudRows(snapshot){
    var self=this, uid=this._cloudUser.id, today=this._isoToday();
    var rows={accounts:[],income:[],expenses:[],savings_goals:[],savings_contributions:[],purchase_goals:[],purchase_contributions:[],debts:[],debt_payments:[],loans_given:[],loan_repayments:[]};
    (snapshot.accounts||[]).forEach(function(a){
      var cur=self._rc(a), id=self._cloudStableId("accounts", a.id||a.name);
      rows.accounts.push({id:id,user_id:uid,name:a.name||"Compte",type:a.type||"Autre",balance_minor:Math.trunc(Number(a.balance_minor)||0),currency:cur});
    });
    (snapshot.incomes||[]).forEach(function(i){
      var cur=self._rc(i), id=self._cloudStableId("income", i.id||i.label);
      rows.income.push({id:id,user_id:uid,account_id:self._cloudAccountIdByName(snapshot,i.account,cur),amount_minor:Math.trunc(Number(i.amount_minor)||0),currency:cur,source:i.source||"Autre",category:i.label||i.category||i.source||"Revenu",payment_method:i.method||i.payment_method||"",income_date:self._isoDateMaybe(i.date_iso)||self._isoDateMaybe(i.date)||today,note:i.note||""});
    });
    (snapshot.expenses||[]).forEach(function(e){
      var cur=self._rc(e), id=self._cloudStableId("expenses", e.id||e.payee);
      rows.expenses.push({id:id,user_id:uid,account_id:self._cloudAccountIdByName(snapshot,e.account,cur),amount_minor:Math.trunc(Number(e.amount_minor)||0),currency:cur,category:e.cat||e.category||"Divers",merchant:e.payee||e.merchant||"",payment_method:e.method||e.payment_method||"",expense_date:self._isoDateMaybe(e.date_iso)||self._isoDateMaybe(e.date)||today,note:e.note||""});
    });
    (snapshot.savings||[]).forEach(function(g){
      var cur=self._rc(g), id=self._cloudStableId("savings", g.id||g.name);
      rows.savings_goals.push({id:id,user_id:uid,name:g.name||"Objectif",target_amount_minor:Math.trunc(Number(g.target_amount_minor)||0),current_amount_minor:Math.trunc(Number(g.current_amount_minor)||0),currency:cur,target_date:self._isoDateMaybe(g.target_iso)||self._isoDateMaybe(g.date),category:g.category||"",status:g.status||"En cours",note:g.note||""});
    });
    (snapshot.savingsContributions||[]).forEach(function(c){
      var cur=self._cur(c.currency), id=self._cloudStableId("savingsContributions", c.id);
      rows.savings_contributions.push({id:id,user_id:uid,savings_goal_id:self._cloudStableId("savings", c.savings_goal_id),account_id:self._cloudAccountIdByName(snapshot,c.account,cur),amount_minor:Math.trunc(Number(c.amount_minor)||0),currency:cur,contribution_date:self._isoDateMaybe(c.date_iso)||self._isoDateMaybe(c.date)||today,note:c.note||""});
    });
    (snapshot.pots||[]).forEach(function(g){
      var cur=self._rc(g), id=self._cloudStableId("pots", g.id||g.name);
      rows.purchase_goals.push({id:id,user_id:uid,item_name:g.name||"Cagnotte",description:g.description||"",target_amount_minor:Math.trunc(Number(g.target_amount_minor)||0),current_amount_minor:Math.trunc(Number(g.current_amount_minor)||0),currency:cur,target_date:self._isoDateMaybe(g.target_iso||g.date),priority:g.priority||"Moyenne",status:g.status||"En cours",image_url:self._safeImageUrl(g.image_url),note:g.note||""});
    });
    (snapshot.purchaseContributions||[]).forEach(function(c){
      var cur=self._cur(c.currency), id=self._cloudStableId("purchaseContributions", c.id);
      rows.purchase_contributions.push({id:id,user_id:uid,purchase_goal_id:self._cloudStableId("pots", c.purchase_goal_id),account_id:self._cloudAccountIdByName(snapshot,c.account,cur),amount_minor:Math.trunc(Number(c.amount_minor)||0),currency:cur,contribution_date:self._isoDateMaybe(c.date_iso)||self._isoDateMaybe(c.date)||today,note:c.note||""});
    });
    (snapshot.debts||[]).forEach(function(d){
      var cur=self._rc(d), id=self._cloudStableId("debts", d.id||d.name);
      rows.debts.push({id:id,user_id:uid,creditor_name:d.creditor||"",debt_name:d.name||"Dette",total_amount_minor:Math.trunc(Number(d.total_amount_minor)||0),paid_amount_minor:Math.trunc(Number(d.paid_amount_minor)||0),currency:cur,start_date:self._isoDateMaybe(d.start_date_iso)||today,next_payment_date:self._isoDateMaybe(d.due_iso)||self._isoDateMaybe(d.due),payment_frequency:d.freq||"",status:d.status||"A jour",note:d.note||""});
    });
    (snapshot.debtPayments||[]).forEach(function(p){
      var cur=self._cur(p.currency), id=self._cloudStableId("debtPayments", p.id);
      rows.debt_payments.push({id:id,user_id:uid,debt_id:self._cloudStableId("debts", p.debt_id),account_id:self._cloudAccountIdByName(snapshot,p.account,cur),amount_minor:Math.trunc(Number(p.amount_minor)||0),currency:cur,payment_date:self._isoDateMaybe(p.date_iso)||self._isoDateMaybe(p.date)||today,note:p.note||""});
    });
    (snapshot.loans||[]).forEach(function(l){
      var cur=self._rc(l), id=self._cloudStableId("loans", l.id||l.name);
      rows.loans_given.push({id:id,user_id:uid,borrower_name:l.name||"",amount_lent_minor:Math.trunc(Number(l.amount_lent_minor)||0),amount_repaid_minor:Math.trunc(Number(l.amount_repaid_minor)||0),currency:cur,loan_date:self._isoDateMaybe(l.loan_date_iso)||today,expected_repayment_date:self._isoDateMaybe(l.due_iso)||self._isoDateMaybe(l.due),repayment_frequency:l.freq||"",status:l.status||"En attente",note:l.note||""});
    });
    (snapshot.loanRepayments||[]).forEach(function(rp){
      var cur=self._cur(rp.currency), id=self._cloudStableId("loanRepayments", rp.id);
      rows.loan_repayments.push({id:id,user_id:uid,loan_id:self._cloudStableId("loans", rp.loan_id),account_id:self._cloudAccountIdByName(snapshot,rp.account,cur),amount_minor:Math.trunc(Number(rp.amount_minor)||0),currency:cur,repayment_date:self._isoDateMaybe(rp.date_iso)||self._isoDateMaybe(rp.date)||today,note:rp.note||""});
    });
    return rows;
  }
  _cloudPersistSnapshotNow(snapshot){
    if(!this._cloudUser) return Promise.resolve(null);
    var rows=this._cloudRows(snapshot), self=this;
    return this._cloudUpsert("accounts", rows.accounts)
      .then(function(){ return self._cloudUpsert("savings_goals", rows.savings_goals); })
      .then(function(){ return self._cloudUpsert("purchase_goals", rows.purchase_goals); })
      .then(function(){ return self._cloudUpsert("debts", rows.debts); })
      .then(function(){ return self._cloudUpsert("loans_given", rows.loans_given); })
      .then(function(){ return self._cloudUpsert("income", rows.income); })
      .then(function(){ return self._cloudUpsert("expenses", rows.expenses); })
      .then(function(){ return self._cloudUpsert("savings_contributions", rows.savings_contributions); })
      .then(function(){ return self._cloudUpsert("purchase_contributions", rows.purchase_contributions); })
      .then(function(){ return self._cloudUpsert("debt_payments", rows.debt_payments); })
      .then(function(){ return self._cloudUpsert("loan_repayments", rows.loan_repayments); })
      .then(function(){ return self._cloudPersistPlan(snapshot.financialPlan); });
  }
  _selectAll(table, order){
    var q=this.sb.from(table).select("*");
    if(order) q=q.order(order,{ascending:false});
    return q.then(function(r){ if(r.error) throw r.error; return r.data||[]; });
  }
  _cloudLoad(){
    var self=this;
    if(!this._cloudEnabled() || !this._cloudReady() || !this._cloudUser) return Promise.resolve(null);
    return Promise.all([
      this._selectAll("accounts","created_at"),
      this._selectAll("income","income_date"),
      this._selectAll("expenses","expense_date"),
      this._selectAll("savings_goals","created_at"),
      this._selectAll("savings_contributions","created_at"),
      this._selectAll("purchase_goals","created_at"),
      this._selectAll("purchase_contributions","created_at"),
      this._selectAll("debts","created_at"),
      this._selectAll("debt_payments","created_at"),
      this._selectAll("loans_given","created_at"),
      this._selectAll("loan_repayments","created_at"),
      this._cloudLoadPlan()
    ]).then(function(all){
      var accRows=all[0], accById={}, finPlan=all[11]||self._defaultFinancialPlan(), debtMeta=self._debtMetaFromPlan(finPlan), purchaseMeta=self._purchaseMetaFromPlan(finPlan);
      var accounts=accRows.map(function(a){
        accById[a.id]=a;
        return {id:a.id,name:a.name,type:a.type||"Autre",balance_minor:a.balance_minor||0,currency:self._cur(a.currency),updated:"Cloud",linked:true,icon:self._iconForType(a.type||"Autre"),c:"#1E5081",b:"#EAF1F8"};
      });
      function accName(id){ return id && accById[id] ? accById[id].name : ""; }
      var snapshot={v:2,currency:self.state.currency,
        accounts:accounts,
        incomes:all[1].map(function(i){ return {id:i.id,source:i.source||"Autre",label:i.category||i.source||"Revenu",amount_minor:i.amount_minor||0,currency:self._cur(i.currency),freq:"Ponctuel",date:self._fullFromIso(i.income_date),date_iso:i.income_date||null,period:self._periodFromIso(i.income_date),month:self._monthFromIso(i.income_date),account:accName(i.account_id),note:i.note||""}; }),
        expenses:all[2].map(function(e){ return {id:e.id,cat:e.category||"Divers",payee:e.merchant||"Dépense",amount_minor:e.amount_minor||0,currency:self._cur(e.currency),method:e.payment_method||"",account:accName(e.account_id),date:self._shortFromIso(e.expense_date),date_iso:e.expense_date||null,period:self._periodFromIso(e.expense_date),month:self._monthFromIso(e.expense_date),proof:null,note:e.note||""}; }),
        savings:all[3].map(function(g){ return {id:g.id,name:g.name,target_amount_minor:g.target_amount_minor||0,current_amount_minor:g.current_amount_minor||0,currency:self._cur(g.currency),date:self._fullFromIso(g.target_date),target_iso:g.target_date||null,status:g.status||"En cours",note:g.note||""}; }),
        savingsContributions:all[4].map(function(c){ return {id:c.id,savings_goal_id:c.savings_goal_id,account:accName(c.account_id),amount_minor:c.amount_minor||0,currency:self._cur(c.currency),date:self._fullFromIso(c.contribution_date),date_iso:c.contribution_date||null,period:self._periodFromIso(c.contribution_date),note:c.note||""}; }),
        pots:all[5].map(function(g){ var m=purchaseMeta[String(g.item_name||"").toLowerCase()]||{}; return {id:g.id,name:g.item_name,target_amount_minor:g.target_amount_minor||0,current_amount_minor:g.current_amount_minor||0,currency:self._cur(g.currency),date:self._fullFromIso(g.target_date),target_iso:m.target_iso||g.target_date||null,priority:g.priority||"Moyenne",status:g.status||"En cours",note:g.note||"",goal_type:m.goal_type||"",planned:!!m.planned,weekly_minor:m.weekly_minor||0,image_url:self._safeImageUrl(g.image_url||m.image_url)}; }),
        purchaseContributions:all[6].map(function(c){ return {id:c.id,purchase_goal_id:c.purchase_goal_id,account:accName(c.account_id),amount_minor:c.amount_minor||0,currency:self._cur(c.currency),date:self._fullFromIso(c.contribution_date),date_iso:c.contribution_date||null,period:self._periodFromIso(c.contribution_date),note:c.note||""}; }),
        debts:all[7].map(function(d){ const m=debtMeta[String(d.debt_name||"").toLowerCase()]||{}; return {id:d.id,name:d.debt_name||"Dette",creditor:d.creditor_name||"",total_amount_minor:d.total_amount_minor||0,paid_amount_minor:d.paid_amount_minor||0,currency:self._cur(d.currency),start_date_iso:d.start_date||null,due:self._fullFromIso(d.next_payment_date),due_iso:d.next_payment_date||null,status:d.status||"A jour",note:d.note||"",minimum_minor:m.minimum_minor||0,apr_bps:m.apr_bps||0}; }),
        debtPayments:all[8].map(function(p){ return {id:p.id,debt_id:p.debt_id,account:accName(p.account_id),amount_minor:p.amount_minor||0,currency:self._cur(p.currency),date:self._fullFromIso(p.payment_date),date_iso:p.payment_date||null,period:self._periodFromIso(p.payment_date),note:p.note||""}; }),
        loans:all[9].map(function(l){ return {id:l.id,name:l.borrower_name||"",rel:"—",amount_lent_minor:l.amount_lent_minor||0,amount_repaid_minor:l.amount_repaid_minor||0,currency:self._cur(l.currency),loan_date_iso:l.loan_date||null,due:self._fullFromIso(l.expected_repayment_date),due_iso:l.expected_repayment_date||null,status:l.status||"En attente",proof:false,note:l.note||""}; }),
        loanRepayments:all[10].map(function(r){ return {id:r.id,loan_id:r.loan_id,account:accName(r.account_id),amount_minor:r.amount_minor||0,currency:self._cur(r.currency),date:self._fullFromIso(r.repayment_date),date_iso:r.repayment_date||null,period:self._periodFromIso(r.repayment_date),note:r.note||""}; }),
        financialPlan:finPlan
      };
      self._cloudApplySnapshot(snapshot);
      return snapshot;
    }).catch(function(e){ self._cloudHandleError("load", e); return null; });
  }
  _cloudParentMeta(parent){
    var p=String(parent||"").split(":");
    if(p[0]==="income" && p[1]) return {table:"income_attachments",fk:"income_id",id:this._cloudStableId("income",p[1])};
    if(p[0]==="expense" && p[1]) return {table:"expense_attachments",fk:"expense_id",id:this._cloudStableId("expenses",p[1])};
    if(p[0]==="debt" && p[1] && p[2]) return {table:"debt_payment_attachments",fk:"debt_payment_id",id:this._cloudStableId("debtPayments",p[2])};
    if(p[0]==="debt" && p[1]) return {table:"debt_attachments",fk:"debt_id",id:this._cloudStableId("debts",p[1])};
    if(p[0]==="loan" && p[1]) return {table:"loan_attachments",fk:"loan_id",id:this._cloudStableId("loans",p[1])};
    if(p[0]==="loanrepay" && p[1] && p[2]) return {table:"loan_repayment_attachments",fk:"loan_repayment_id",id:this._cloudStableId("loanRepayments",p[2])};
    return null;
  }
  _cloudCleanName(name){ return String(name||"fichier").replace(/[^a-zA-Z0-9_.-]+/g,"_").slice(0,90)||"fichier"; }
  _cloudSaveFiles(parent, fileList){
    var self=this;
    return (async function(){
      if(!self._cloudUser) return 0;
      var meta=self._cloudParentMeta(parent);
      if(!meta){ self.showToast("warn","Parent cloud introuvable."); return 0; }
      await self._cloudPersistSnapshotNow(self._snapshotFromState());
      var n=0, bucket=self.sb.storage.from("justificatifs"), uid=self._cloudUser.id;
      for(var i=0;i<fileList.length;i++){
        var f=fileList[i];
        if(self.MC_OK_TYPES.indexOf(f.type)<0){ self.showToast("warn","Type refusé : "+f.name); continue; }
        if(f.size>self.MC_MAX){ self.showToast("warn","Fichier trop lourd (5 Mo max) : "+f.name); continue; }
        var path=uid+"/"+Date.now()+"_"+self._uid()+"_"+self._cloudCleanName(f.name);
        var up=await bucket.upload(path, f, {upsert:true, contentType:f.type||"application/octet-stream"});
        if(up.error) throw up.error;
        var row={id:self._uid(),user_id:uid,file_path:path,file_name:f.name,file_type:f.type||"application/octet-stream",file_size:f.size||0};
        row[meta.fk]=meta.id;
        var ins=await self.sb.from(meta.table).upsert(row,{onConflict:"id"});
        if(ins.error) throw ins.error;
        n++;
      }
      return n;
    })().catch(function(e){ self._cloudHandleError("files", e); self.showToast("warn","Justificatif cloud non enregistre."); return 0; });
  }
  _cloudFilesByParent(parent){
    var self=this, meta=this._cloudParentMeta(parent);
    if(!meta || !this._cloudUser) return Promise.resolve([]);
    return this.sb.from(meta.table).select("*").eq(meta.fk,meta.id).order("created_at",{ascending:false}).then(function(r){
      if(r.error) throw r.error;
      var rows=r.data||[], bucket=self.sb.storage.from("justificatifs");
      return Promise.all(rows.map(function(row){
        return bucket.createSignedUrl(row.file_path, 600).then(function(signed){
          return {id:row.id,parent:parent,name:row.file_name||"fichier",mime:row.file_type||"",size:row.file_size||0,path:row.file_path,url:signed.data?signed.data.signedUrl:null,at:row.created_at,cloud:true,table:meta.table};
        });
      }));
    }).catch(function(e){ self._cloudHandleError("files", e); return []; });
  }
  _cloudDeleteFile(f){
    if(!f || !f.cloud || !f.table) return Promise.resolve(null);
    return this.sb.storage.from("justificatifs").remove([f.path]).then((r)=>{
      if(r.error) throw r.error;
      return this.sb.from(f.table).delete().eq("id",f.id);
    }).then((r)=>{
      if(r?.error) throw r.error;
      return null;
    }).catch((e)=>{ this._cloudHandleError("deleteFile", e); });
  }

  /* =================================================================
     TESTS MONÉTAIRES — window.__mcMoneyTests()
     ================================================================= */
  _moneyTests(){
    var self=this, results=[], pass=0, fail=0;
    function chk(name, actual, expected){
      var ok = JSON.stringify(actual)===JSON.stringify(expected);
      if(ok) pass++; else fail++;
      results.push({name:name, ok:ok, actual:actual, expected:expected});
    }
    var nb=" "; // non-breaking space used by mFmt

    // --- Parsing: no floating point ---
    chk("parse USD '12,34' -> 1234",      self.mParse("12,34","USD"), 1234);
    chk("parse USD '12.34' -> 1234",      self.mParse("12.34","USD"), 1234);
    chk("parse USD '0' -> 0",             self.mParse("0","USD"), 0);
    chk("parse USD '' -> 0",              self.mParse("","USD"), 0);
    chk("parse USD 'abc' -> 0",           self.mParse("abc","USD"), 0);
    chk("parse USD '850' -> 85000",       self.mParse("850","USD"), 85000);
    chk("parse USD '1 000,50' -> 100050", self.mParse("1 000,50","USD"), 100050);
    chk("parse USD arrondi '12,345' -> 1235", self.mParse("12,345","USD"), 1235);
    chk("parse USD arrondi '12,344' -> 1234", self.mParse("12,344","USD"), 1234);
    chk("parse XOF '1500' -> 1500",       self.mParse("1500","XOF"), 1500);
    chk("parse XOF '1500,6' -> 1501",     self.mParse("1500,6","XOF"), 1501);
    chk("parse XAF '250' -> 250",         self.mParse("250","XAF"), 250);

    // --- Integrity: no floating point drift ---
    chk("0,1 + 0,2 === 0,3 (cents)", self.mParse("0,1","USD")+self.mParse("0,2","USD"), self.mParse("0,3","USD"));
    chk("somme de 10x 0,1 === 1,00", (function(){ var t=0; for(var i=0;i<10;i++) t+=self.mParse("0,1","USD"); return t; })(), self.mParse("1","USD"));
    chk("tous les montants sont entiers", (function(){
      var s=self.state, all=[], ok=true;
      s.accounts.forEach(a=>all.push(a.balance_minor));
      s.incomes.forEach(i=>all.push(i.amount_minor));
      s.expenses.forEach(e=>all.push(e.amount_minor));
      s.savings.forEach(g=>{all.push(g.target_amount_minor);all.push(g.current_amount_minor);});
      s.pots.forEach(g=>{all.push(g.target_amount_minor);all.push(g.current_amount_minor);});
      s.debts.forEach(d=>{all.push(d.total_amount_minor);all.push(d.paid_amount_minor);});
      s.loans.forEach(l=>{all.push(l.amount_lent_minor);all.push(l.amount_repaid_minor);});
      all.forEach(function(n){ if(!Number.isInteger(n)) ok=false; });
      return ok;
    })(), true);

    // --- Formatting: no conversion ---
    chk("fmt 85000 USD -> 850 $",     self.mFmt(85000,"USD"), "850"+nb+"$");
    chk("fmt 1234 USD -> 12,34 $",    self.mFmt(1234,"USD"), "12,34"+nb+"$");
    chk("fmt 100050 USD -> 1 000,50 $", self.mFmt(100050,"USD"), new Intl.NumberFormat("fr-FR").format(1000)+",50"+nb+"$");
    chk("fmt 0 USD -> 0 $",           self.mFmt(0,"USD"), "0"+nb+"$");
    chk("fmt 1500 XOF -> 1 500 FCFA", self.mFmt(1500,"XOF"), new Intl.NumberFormat("fr-FR").format(1500)+nb+"FCFA");
    chk("fmt signé +230000 USD",      self.mFmt(230000,"USD",true), "+"+new Intl.NumberFormat("fr-FR").format(2300)+nb+"$");
    chk("fmt négatif -1234 USD",      self.mFmt(-1234,"USD"), "-12,34"+nb+"$");
    chk("aucune conversion : 100 USD et 100 EUR ont le meme nombre",
        [self.mFmt(10000,"USD").replace(/\D/g,""), self.mFmt(10000,"EUR").replace(/\D/g,"")], ["100","100"]);

    // --- Round trip ---
    chk("roundtrip 12,34 USD", self.mParse(self._plain(self.mParse("12,34","USD"),"USD"),"USD"), 1234);
    chk("roundtrip 1500 XOF",  self.mParse(self._plain(self.mParse("1500","XOF"),"XOF"),"XOF"), 1500);

    // --- Migration v1 -> v2 ---
    chk("migration float 120 -> 12000 cents", self._toMinorFromFloat(120,2), 12000);
    chk("migration float 0.1 -> 10 cents",    self._toMinorFromFloat(0.1,2), 10);
    chk("migration float 1500 -> 1500 (XOF)", self._toMinorFromFloat(1500,0), 1500);
    chk("migration float 3500 -> 350000",     self._toMinorFromFloat(3500,2), 350000);

    // --- Dashboard totals: demo data ---
    var v=self.renderVals();
    chk("total disponible = 850 $", v.totalAvailableStr, "850"+nb+"$");
    chk("dépenses du mois = 1 200 $", v.monthExpenseStr, new Intl.NumberFormat("fr-FR").format(1200)+nb+"$");
    chk("dettes restantes = 1 900 $", v.debtTotalStr, new Intl.NumberFormat("fr-FR").format(1900)+nb+"$");
    chk("prêté à récupérer = 230 $", v.lentTotalStr, "230"+nb+"$");

    return { passed:pass, failed:fail, total:pass+fail, results:results.filter(r=>!r.ok).length?results.filter(r=>!r.ok):results };
  }
}

if(typeof module!=="undefined" && module.exports){
  module.exports={Component};
}
