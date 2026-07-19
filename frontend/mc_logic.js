
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

  /* ---------- Storage keys ---------- */
  _KEY    = "moncoffre.local.v2";
  _KEY_V1 = "moncoffre.local.v1";
  _KEY_BK = "moncoffre.local.v1.backup";

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
    form: { amount:"", date:"5 juil 2026", category:"Alimentation", method:"Carte", account:"Compte bancaire", payee:"", note:"", proof:null },
    fExpMonth:"Juillet", fExpCat:"Toutes", fIncMonth:"Tous", fIncSource:"Toutes",
    accounts: [
      {id:"cash",    name:"Espèces",         type:"Argent liquide",       balance_minor:12000, currency:"USD", updated:"Aujourd'hui", linked:true,  icon:"cash",  c:"#3F9A5A", b:"#E7F3EB"},
      {id:"bank",    name:"Compte bancaire", type:"Banque",               balance_minor:73000, currency:"USD", updated:"Hier",        linked:true,  icon:"bank",  c:"#1E5081", b:"#EAF1F8"},
      {id:"paypal",  name:"PayPal",          type:"Portefeuille en ligne",balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#2A6FB0", b:"#E7F0F9"},
      {id:"cashapp", name:"Cash App",        type:"Portefeuille en ligne",balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#3F9A5A", b:"#E7F3EB"},
      {id:"zelle",   name:"Zelle",           type:"Transfert",            balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"card",  c:"#6E57B8", b:"#EEEAF8"},
      {id:"momo",    name:"Mobile Money",    type:"Mobile",               balance_minor:0,     currency:"USD", updated:"Non lié",     linked:false, icon:"phone", c:"#B98A2E", b:"#F6EED7"}
    ],
    incomes: [
      {id:"i1", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 juil 2026", month:"Juillet", account:"Compte bancaire"},
      {id:"i2", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 juin 2026", month:"Juin",    account:"Compte bancaire"},
      {id:"i3", source:"Freelance",  label:"Mission design",      amount_minor:30000,  currency:"USD", freq:"Ponctuel", date:"12 juin 2026",month:"Juin",    account:"PayPal"},
      {id:"i4", source:"Salaire",    label:"Salaire — Employeur", amount_minor:350000, currency:"USD", freq:"Mensuel",  date:"1 mai 2026",  month:"Mai",     account:"Compte bancaire"}
    ],
    expenses: [
      {id:"e1", cat:"Logement",     payee:"Propriétaire",       amount_minor:60000, currency:"USD", method:"Virement",    account:"Compte bancaire", date:"1 juil", month:"Juillet", proof:"PDF"},
      {id:"e2", cat:"Alimentation", payee:"Supermarché",        amount_minor:18000, currency:"USD", method:"Carte",       account:"Compte bancaire", date:"3 juil", month:"Juillet", proof:null},
      {id:"e3", cat:"Divers",       payee:"Cadeau anniversaire",amount_minor:12000, currency:"USD", method:"Cash App",    account:"Cash App",        date:"4 juil", month:"Juillet", proof:null},
      {id:"e4", cat:"Santé",        payee:"Pharmacie",          amount_minor:8000,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"3 juil", month:"Juillet", proof:"Reçu"},
      {id:"e5", cat:"Factures",     payee:"Électricité",        amount_minor:7500,  currency:"USD", method:"Prélèvement", account:"Compte bancaire", date:"2 juil", month:"Juillet", proof:"Facture"},
      {id:"e6", cat:"Transport",    payee:"Carburant",          amount_minor:6000,  currency:"USD", method:"Espèces",     account:"Espèces",         date:"4 juil", month:"Juillet", proof:null},
      {id:"e7", cat:"Restaurants",  payee:"Le Bistro",          amount_minor:4500,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"5 juil", month:"Juillet", proof:"Photo"},
      {id:"e8", cat:"Abonnements",  payee:"Forfait téléphone",  amount_minor:4000,  currency:"USD", method:"Carte",       account:"Compte bancaire", date:"2 juil", month:"Juillet", proof:null}
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
      {id:"d1", name:"Dette voiture",    creditor:"Concessionnaire Auto", total_amount_minor:250000, paid_amount_minor:80000, currency:"USD", due:"15 juil 2026", status:"À jour"},
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
    loanRepayments: []
  };

  get mode(){ return (this.props && this.props.mode) || "desktop"; }
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

  go(p){ this.setState({page:p, menuOpen:false, addOpen:false}); }
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
  setForm(k,v){ this.setState(s=>({form:Object.assign({},s.form,{[k]:v})})); }
  setAmount(e){ this.setForm("amount", e.target.value.replace(/[^0-9.,]/g,"")); }
  setPayee(e){ this.setForm("payee", e.target.value); }
  filterChip(active){ const C=this.C; return {padding:"8px 13px",borderRadius:"10px",fontSize:"12.5px",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",border:"1px solid "+(active?"transparent":"#E1E4DE"),background:active?C.ink:"#fff",color:active?"#fff":C.ink2}; }

  openAdd(){
    var p=this.state.page;
    var map={available:"account", income:"income", savings:"saving", pots:"pot", debts:"debt", loans:"loan"};
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
    var id=this._uid();
    var exp={id:id, cat:f.category, payee:f.payee||"Dépense", amount_minor:amt, currency:cur, method:f.method, account:f.account, date:this._todayShort(), month:this._thisMonth(), proof:f.proof};
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
  dDebt(g){
    const cur=this._rc(g), p=this.pct(g.paid_amount_minor,g.total_amount_minor), rem=Math.max(0,g.total_amount_minor-g.paid_amount_minor);
    return Object.assign({},g,{pctNum:p,pctStr:p+" %",paidStr:this.mFmt(g.paid_amount_minor,cur),totalStr:this.mFmt(g.total_amount_minor,cur),remainStr:this.mFmt(rem,cur),barStyle:this.bar(p,g.status==="En retard"?"#C99A38":this.C.green),statusSty:this.statusStyle(g.status),late:g.status==="En retard",open:rem>0,onPay:()=>this.rembourserDette(g.name)});
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
    const cur=this._cur(S.currency), self=this;

    // Totals: integers only, active currency only, no conversion.
    const totalAvailable=this._sum(acc.filter(a=>a.linked),"balance_minor");
    const monthIncome=this._sum(inc.filter(i=>i.month==="Juillet"),"amount_minor");
    const monthExpense=this._sum(exp.filter(e=>e.month==="Juillet"),"amount_minor");
    const totalSavings=this._sum(sav,"current_amount_minor");
    let totalDebt=0; deb.forEach(d=>{ if(self._same(d)) totalDebt+=Math.max(0,d.total_amount_minor-d.paid_amount_minor); });
    let totalLent=0; loa.forEach(l=>{ if(self._same(l)) totalLent+=Math.max(0,l.amount_lent_minor-l.amount_repaid_minor); });
    const net=monthIncome-monthExpense;

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
      {label:"Argent disponible",value:this.mFmt(totalAvailable,cur),icon:this.ICONS.wallet,c:C.green,b:C.greenBg,sub:"2 comptes actifs",page:"available"},
      {label:"Revenus du mois",value:this.mFmt(monthIncome,cur),icon:this.ICONS.income,c:C.brand,b:C.brandBg,sub:"Juillet",page:"income"},
      {label:"Dépenses du mois",value:this.mFmt(monthExpense,cur),icon:this.ICONS.expense,c:C.gold,b:C.goldBg,sub:"Juillet",page:"expenses"},
      {label:"Épargne totale",value:this.mFmt(totalSavings,cur),icon:this.ICONS.savings,c:C.green,b:C.greenBg,sub:"3 objectifs",page:"savings"},
      {label:"Dettes restantes",value:this.mFmt(totalDebt,cur),icon:this.ICONS.debts,c:C.danger,b:C.dangerBg,sub:"à rembourser",page:"debts"},
      {label:"Prêté à récupérer",value:this.mFmt(totalLent,cur),icon:this.ICONS.loans,c:C.brand,b:C.brandBg,sub:"2 personnes",page:"loans"}
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
    const incMonths=["Tous","Juillet","Juin","Mai"].map(m=>({label:m,onClick:()=>this.setState({fIncMonth:m}),style:filt(S.fIncMonth===m)}));
    const incSources=["Toutes","Salaire","Freelance"].map(m=>({label:m,onClick:()=>this.setState({fIncSource:m}),style:filt(S.fIncSource===m)}));
    const expMonths=["Tous","Juillet"].map(m=>({label:m,onClick:()=>this.setState({fExpMonth:m}),style:filt(S.fExpMonth===m)}));
    const expCats=["Toutes"].concat(Object.keys(this.CAT)).map(m=>({label:m,onClick:()=>this.setState({fExpCat:m}),style:filt(S.fExpCat===m)}));
    const catMap={}; exp.filter(e=>e.month==="Juillet"&&self._same(e)).forEach(e=>{catMap[e.cat]=(catMap[e.cat]||0)+e.amount_minor;});
    const catMax=Math.max.apply(null,[1].concat(Object.keys(catMap).map(k=>catMap[k])));
    const catBreak=Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a]).map(k=>{const cat=this.CAT[k]||this.CAT["Divers"]; return {cat:k,amountStr:this.mFmt(catMap[k],cur),color:cat.c,barStyle:{height:"10px",width:this.pct(catMap[k],catMax)+"%",background:cat.c,borderRadius:"99px",animation:"mcBar .9s ease both"},pctStr:this.pct(catMap[k],monthExpense)+" %"};});
    const im=[["Fév",350000],["Mar",350000],["Avr",350000],["Mai",350000],["Juin",380000],["Juil",350000]]; const imMax=Math.max.apply(null,im.map(x=>x[1]));
    const incomeMonths=im.map(x=>({m:x[0],amountStr:this.mFmt(x[1],cur),barStyle:{width:"58%",height:Math.round(x[1]/imMax*112)+"px",background:x[0]==="Juil"?C.brand:"#BED0E3",borderRadius:"7px 7px 3px 3px"}}));
    const tv=[["Fév",600],["Mar",900],["Avr",1400],["Mai",1900],["Juin",2300],["Juil",2700]]; const tMax=2700;
    const tpts=tv.map((x,i)=>[Math.round(i/(tv.length-1)*300),Math.round(110-(x[1]/tMax)*86-10)]);
    const trendLine=tpts.map(p=>p[0]+","+p[1]).join(" ");
    const trendArea="0,112 "+trendLine+" 300,112";
    const trendLabels=tv.map(x=>x[0]);
    return {
      isDesktop, isMobile, mode,
      pLogin: page==="login", inApp: page!=="login",
      pDash: page==="dashboard", pAvail: page==="available", pInc: page==="income", pExp: page==="expenses",
      pSave: page==="savings", pPots: page==="pots", pDebts: page==="debts", pLoans: page==="loans", pReports: page==="reports", pSettings: page==="settings",
      pageTitle:this.titleOf(page), dateStr:"5 juillet 2026", name:"NYPAL", avatar:"NY",
      greetHi:"Bonjour, NYPAL", coachLine:"Tu avances bien ce mois-ci. Ton coffre est stable.",
      mobileTitle: page==="dashboard"?"Bonjour, NYPAL":this.titleOf(page),
      mobileSub: page==="dashboard"?"Tu avances bien ce mois-ci.":"Mon Coffre",
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
      expensesView: exp.filter(e=>(S.fExpMonth==="Tous"||e.month===S.fExpMonth)&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat)).map(e=>this.dExp(e)),
      monthExpenseStr:this.mFmt(monthExpense,cur),
      incomesView: inc.filter(i=>(S.fIncMonth==="Tous"||i.month===S.fIncMonth)&&(S.fIncSource==="Toutes"||i.source===S.fIncSource)).map(i=>this.dInc(i)),
      monthIncomeStr:this.mFmt(monthIncome,cur),
      savingsView: sav.map(g=>this.dSav(g)), savingsTotalStr:this.mFmt(totalSavings,cur), savingsTargetStr:this.mFmt(this._sum(sav,"target_amount_minor"),cur),
      potsView: pot.map(g=>this.dPot(g)),
      debtsView: deb.map(g=>this.dDebt(g)), debtTotalStr:this.mFmt(totalDebt,cur),
      loansView: loa.map(g=>this.dLoan(g)), lentTotalStr:this.mFmt(totalLent,cur), lentBackStr:this.mFmt(this._sum(loa,"amount_repaid_minor"),cur),
      incMonths, incSources, expMonths, expCats, catBreak, incomeMonths, trendLine, trendArea, trendLabels,
      demoIncome:()=>this.openForm("income"),
      expEmpty: exp.filter(e=>(S.fExpMonth==="Tous"||e.month===S.fExpMonth)&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat)).length===0,
      incEmpty: inc.filter(i=>(S.fIncMonth==="Tous"||i.month===S.fIncMonth)&&(S.fIncSource==="Toutes"||i.source===S.fIncSource)).length===0
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
    return snapshot;
  }
  _esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
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
        self._normalizeIds(); self._wireRows(); self._wireLogin();
        if(self._migrated){ self._migrated=false; self.showToast("ok","Données migrées vers le modèle monétaire entier."); }
      });
    } else {
      this._normalizeIds();
      this._wireRows();
      this._wireLogin();
    }
    this._maybeInitCloud();
  }
  componentDidUpdate(){ this._wireRows(); this._wireLogin(); }

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
        inp2.type="text"; inp2.value=f.value!=null?f.value:""; inp2.placeholder=f.placeholder||"";
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
        self.showToast("ok", a?"Solde mis à jour.":"Compte ajouté.");
      }, a?"Mettre à jour":"Ajouter le compte");
    }
    else if(kind==="income"){
      var Fi=this._buildForm([
        {key:"amount",label:"Montant reçu",type:"amount",required:true},
        {key:"label",label:"Libellé",type:"text",required:true,placeholder:"Ex : Salaire — Employeur"},
        {key:"source",label:"Source",type:"chips",options:["Salaire","Freelance","Business","Cadeau","Remboursement","Autre"],value:"Salaire"},
        {key:"account",label:"Compte à créditer",type:"select",options:this._accOpts()},
        {key:"freq",label:"Fréquence",type:"chips",options:["Mensuel","Ponctuel","Hebdomadaire","Autre"],value:"Mensuel"},
        {key:"note",label:"Note",type:"text",opt:true}
      ]);
      this._mcModal("Ajouter un revenu", Fi.el, function(){
        var v=Fi.values(), amt=P(v.amount);
        if(amt<=0) return "Indique un montant.";
        if(!v.label) return "Indique un libellé.";
        self.setState(function(s){
          var inc={id:self._uid(),source:v.source,label:v.label,amount_minor:amt,currency:CUR,freq:v.freq,date:self._todayFull(),month:self._thisMonth(),account:v.account,note:v.note||""};
          var accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===CUR)?Object.assign({},a,{balance_minor:a.balance_minor+amt,linked:true,updated:"Aujourd'hui"}):a; });
          return {incomes:[inc].concat(s.incomes), accounts:accs};
        }, function(){ self._persist(); });
        self.showToast("ok","Revenu enregistré. Le compte a été crédité.");
      }, "Enregistrer le revenu");
    }
    else if(kind==="saving"){
      var Fs=this._buildForm([
        {key:"name",label:"Nom de l'objectif",type:"text",required:true,placeholder:"Ex : Fonds d'urgence"},
        {key:"target",label:"Montant cible",type:"amount",required:true},
        {key:"saved",label:"Déjà épargné",type:"number",value:"0"},
        {key:"date",label:"Échéance",type:"text",opt:true,placeholder:"Ex : Déc 2026"}
      ]);
      this._mcModal("Nouvel objectif d'épargne", Fs.el, function(){
        var v=Fs.values(); if(!v.name) return "Indique un nom.";
        var t=P(v.target); if(t<=0) return "Indique un montant cible.";
        var sv=P(v.saved);
        self.setState(function(s){ return {savings:s.savings.concat([{id:self._uid(),name:v.name,target_amount_minor:t,current_amount_minor:sv,currency:CUR,date:v.date||"—",status:(sv>=t?"Atteint":"En cours")}])}; }, function(){ self._persist(); });
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
          var contrib={id:cid,savings_goal_id:g.id,account:v.account||"",amount_minor:amt,currency:gcur,date:self._todayFull(),note:""};
          return {savings:savings, accounts:accs, savingsContributions:(s.savingsContributions||[]).concat([contrib])};
        }, function(){ self._persist(); });
        self.showToast("ok","Épargne mise à jour. Continue comme ça.");
      }, "Épargner");
    }
    else if(kind==="pot"){
      var Fp=this._buildForm([
        {key:"name",label:"Nom de l'objet",type:"text",required:true,placeholder:"Ex : iPhone 15"},
        {key:"price",label:"Prix de l'objet",type:"amount",required:true},
        {key:"saved",label:"Déjà cotisé",type:"number",value:"0"},
        {key:"priority",label:"Priorité",type:"chips",options:["Haute","Moyenne","Basse"],value:"Moyenne"},
        {key:"date",label:"Souhaité pour",type:"text",opt:true,placeholder:"Ex : Sept 2026"}
      ]);
      this._mcModal("Nouvelle cagnotte", Fp.el, function(){
        var v=Fp.values(); if(!v.name) return "Indique le nom de l'objet.";
        var pr=P(v.price); if(pr<=0) return "Indique un prix.";
        var sv=P(v.saved);
        self.setState(function(s){ return {pots:s.pots.concat([{id:self._uid(),name:v.name,target_amount_minor:pr,current_amount_minor:sv,currency:CUR,date:v.date||"—",priority:v.priority,status:(sv>=pr?"Atteint":"En cours")}])}; }, function(){ self._persist(); });
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
          var contrib={id:cid,purchase_goal_id:gp.id,account:v.account||"",amount_minor:amt,currency:pcur,date:self._todayFull(),note:""};
          return {pots:pots, accounts:accs, purchaseContributions:(s.purchaseContributions||[]).concat([contrib])};
        }, function(){ self._persist(); });
        if(reached) self.showToast("ok","Objectif atteint ! Tu peux acheter sans toucher à ton budget.");
        else self.showToast("ok","Tu avances bien — cotisation ajoutée.");
      }, "Cotiser");
    }
    else if(kind==="debt"){
      var Fd=this._buildForm([
        {key:"name",label:"Nom de la dette",type:"text",required:true,placeholder:"Ex : Dette voiture"},
        {key:"creditor",label:"Créancier",type:"text",required:true,placeholder:"À qui dois-tu cet argent ?"},
        {key:"total",label:"Montant total",type:"amount",required:true},
        {key:"paid",label:"Déjà payé",type:"number",value:"0"},
        {key:"due",label:"Prochaine échéance",type:"text",opt:true,placeholder:"Ex : 15 juil 2026"}
      ]);
      this._mcModal("Ajouter une dette", Fd.el, function(){
        var v=Fd.values(); if(!v.name) return "Indique un nom."; if(!v.creditor) return "Indique le créancier.";
        var tot=P(v.total); if(tot<=0) return "Indique le montant total.";
        var pd=P(v.paid);
        self.setState(function(s){ return {debts:s.debts.concat([{id:self._uid(),name:v.name,creditor:v.creditor,total_amount_minor:tot,paid_amount_minor:pd,currency:CUR,due:v.due||"—",status:(pd>=tot?"Soldée":"À jour")}])}; }, function(){ self._persist(); });
        self.showToast("ok","Dette enregistrée — suivi clair et serein.");
      }, "Ajouter la dette");
    }
    else if(kind==="debtPay"){
      var gd=this.state.debts.filter(function(x){return x.name===ctx.name;})[0]; if(!gd) return;
      var dcur=this._rc(gd);
      var Fdp=this._buildForm([
        {key:"amount",label:"Montant payé",type:"amount",required:true},
        {key:"account",label:"Depuis le compte",type:"select",options:this._accOpts(true,"— ne pas déduire —")},
        {key:"due",label:"Prochaine échéance",type:"text",opt:true,value:(gd.due&&gd.due!=="—")?gd.due:"",placeholder:"Ex : 15 août 2026"},
        {key:"proof",label:"Preuve de paiement",type:"file",opt:true}
      ]);
      this._mcModal("Paiement — "+gd.name, Fdp.el, function(){
        var v=Fdp.values(), amt=self.mParse(v.amount,dcur); if(amt<=0) return "Indique un montant.";
        var pid=self._uid();
        self.setState(function(s){
          var debts=s.debts.map(function(x){ if(x.id!==gd.id) return x; var np=Math.min(x.total_amount_minor,x.paid_amount_minor+amt); return Object.assign({},x,{paid_amount_minor:np,due:v.due||x.due,status:(np>=x.total_amount_minor?"Soldée":(x.status==="En retard"?"À jour":x.status))}); });
          var accs=s.accounts; if(v.account) accs=s.accounts.map(function(a){ return (a.name===v.account && self._rc(a)===dcur)?Object.assign({},a,{balance_minor:a.balance_minor-amt,updated:"Aujourd'hui"}):a; });
          var pay={id:pid,debt_id:gd.id,account:v.account||"",amount_minor:amt,currency:dcur,date:self._todayFull(),note:""};
          return {debts:debts, accounts:accs, debtPayments:(s.debtPayments||[]).concat([pay])};
        }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("debt:"+gd.id+":"+pid, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve de paiement jointe."); }); } });
        self.showToast("ok","Paiement enregistré. Tu avances bien.");
      }, "Enregistrer le paiement");
    }
    else if(kind==="loan"){
      var Fl=this._buildForm([
        {key:"name",label:"Nom de la personne",type:"text",required:true,placeholder:"Ex : Karim"},
        {key:"rel",label:"Relation",type:"text",opt:true,placeholder:"Ex : Ami, Sœur, Collègue"},
        {key:"lent",label:"Montant prêté",type:"amount",required:true},
        {key:"repaid",label:"Déjà remboursé",type:"number",value:"0"},
        {key:"due",label:"Retour prévu",type:"text",opt:true,placeholder:"Ex : 20 juil 2026"},
        {key:"proof",label:"Preuve du prêt",type:"file",opt:true}
      ]);
      this._mcModal("Ajouter un prêt accordé", Fl.el, function(){
        var v=Fl.values(); if(!v.name) return "Indique la personne.";
        var lent=P(v.lent); if(lent<=0) return "Indique le montant prêté.";
        var rp=P(v.repaid), id=self._uid();
        self.setState(function(s){ return {loans:s.loans.concat([{id:id,name:v.name,rel:v.rel||"—",amount_lent_minor:lent,amount_repaid_minor:rp,currency:CUR,due:v.due||"—",status:(rp>=lent?"Remboursé":(rp>0?"En cours":"En attente")),proof:!!(v.proof&&v.proof.length)}])}; }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("loan:"+id, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve du prêt jointe."); }); } });
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
          var rep={id:rid,loan_id:gl.id,account:v.account||"",amount_minor:amt,currency:lcur,date:self._todayFull(),note:""};
          return {loans:loans, accounts:accs, loanRepayments:(s.loanRepayments||[]).concat([rep])};
        }, function(){ self._persist(); if(v.proof&&v.proof.length){ self._saveFiles("loanrepay:"+gl.id+":"+rid, v.proof).then(function(n){ if(n) self.showToast("ok","Preuve jointe."); }); } });
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
      var list=S.expenses.filter(function(e){ return (S.fExpMonth==="Tous"||e.month===S.fExpMonth)&&(S.fExpCat==="Toutes"||e.cat===S.fExpCat); });
      var rows=document.querySelectorAll('div[style*="padding: 14px 15px"]');
      Array.prototype.forEach.call(rows, function(el,i){
        el.__mcExp=list[i];
        if(el.__mcWired) return;
        el.__mcWired=true;
        el.style.cursor="pointer";
        el.title="Voir / ajouter les justificatifs";
        el.addEventListener("click", function(){ var ex=el.__mcExp; if(ex) self.openAttManager("expense:"+ex.id, "Justificatifs — "+(ex.payee||ex.cat)); });
      });
    }catch(e){}
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
      s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
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
    }catch(e){}
  }
  _loginFields(){
    var self=this;
    var email=Array.prototype.filter.call(document.querySelectorAll('input[data-mc-login-email="1"],input[type="email"]'), function(el){ return self._visibleEl(el); })[0];
    var pass=Array.prototype.filter.call(document.querySelectorAll('input[data-mc-login-password="1"],input[type="password"]'), function(el){ return self._visibleEl(el); })[0];
    var emailValue=(this._loginEmailValue!=null) ? this._loginEmailValue : (email?email.value.trim():"");
    var passValue=(this._loginPasswordValue!=null) ? this._loginPasswordValue : (pass?pass.value:"");
    if(emailValue==="nypal@moncoffre.app") emailValue="";
    if(passValue==="motdepasse") passValue="";
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
    var patch={currency:this._cur(snapshot.currency)};
    keys.forEach(function(k){ patch[k]=snapshot[k]; });
    var self=this;
    this.setState(patch, function(){ self._normalizeIds(); self._wireRows(); self._wireLogin(); });
    return true;
  }
  _cloudHandleError(stage, err){
    try{
      this._cloudLastError={stage:String(stage||"cloud"), message:(err && err.message) ? String(err.message) : "Erreur cloud"};
      if(this._cloudEnabled() && typeof console!=="undefined" && console.warn){
        console.warn("Cloud Mon Coffre:", this._cloudLastError.stage, this._cloudLastError.message);
      }
    }catch(e){}
  }
  _isoToday(){ return new Date().toISOString().slice(0,10); }
  _isoDateMaybe(v){
    if(!v || v==="—") return null;
    var s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m=s.match(/^(\d{1,2})\s+([^\s]+)(?:\s+(\d{4}))?/);
    if(!m) return null;
    var name=m[2].toLowerCase().replace(".","");
    var map={"janv":0,"janvier":0,"fevr":1,"févr":1,"fevrier":1,"février":1,"mars":2,"avr":3,"avril":3,"mai":4,"juin":5,"juil":6,"juillet":6,"aout":7,"août":7,"sept":8,"septembre":8,"oct":9,"octobre":9,"nov":10,"novembre":10,"dec":11,"déc":11,"decembre":11,"décembre":11};
    if(map[name]==null) return null;
    var y=Number(m[3]||new Date().getFullYear()), d=Number(m[1]), mo=map[name]+1;
    if(!d || d<1 || d>31) return null;
    return String(y).padStart(4,"0")+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");
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
  _cloudRows(snapshot){
    var self=this, uid=this._cloudUser.id, today=this._isoToday();
    var rows={accounts:[],income:[],expenses:[],savings_goals:[],savings_contributions:[],purchase_goals:[],purchase_contributions:[],debts:[],debt_payments:[],loans_given:[],loan_repayments:[]};
    (snapshot.accounts||[]).forEach(function(a){
      var cur=self._rc(a), id=self._cloudStableId("accounts", a.id||a.name);
      rows.accounts.push({id:id,user_id:uid,name:a.name||"Compte",type:a.type||"Autre",balance_minor:Math.trunc(Number(a.balance_minor)||0),currency:cur});
    });
    (snapshot.incomes||[]).forEach(function(i){
      var cur=self._rc(i), id=self._cloudStableId("income", i.id||i.label);
      rows.income.push({id:id,user_id:uid,account_id:self._cloudAccountIdByName(snapshot,i.account,cur),amount_minor:Math.trunc(Number(i.amount_minor)||0),currency:cur,source:i.source||"Autre",category:i.label||i.category||i.source||"Revenu",payment_method:i.method||i.payment_method||"",income_date:self._isoDateMaybe(i.date)||today,note:i.note||""});
    });
    (snapshot.expenses||[]).forEach(function(e){
      var cur=self._rc(e), id=self._cloudStableId("expenses", e.id||e.payee);
      rows.expenses.push({id:id,user_id:uid,account_id:self._cloudAccountIdByName(snapshot,e.account,cur),amount_minor:Math.trunc(Number(e.amount_minor)||0),currency:cur,category:e.cat||e.category||"Divers",merchant:e.payee||e.merchant||"",payment_method:e.method||e.payment_method||"",expense_date:self._isoDateMaybe(e.date)||today,note:e.note||""});
    });
    (snapshot.savings||[]).forEach(function(g){
      var cur=self._rc(g), id=self._cloudStableId("savings", g.id||g.name);
      rows.savings_goals.push({id:id,user_id:uid,name:g.name||"Objectif",target_amount_minor:Math.trunc(Number(g.target_amount_minor)||0),current_amount_minor:Math.trunc(Number(g.current_amount_minor)||0),currency:cur,target_date:self._isoDateMaybe(g.date),category:g.category||"",status:g.status||"En cours",note:g.note||""});
    });
    (snapshot.savingsContributions||[]).forEach(function(c){
      var cur=self._cur(c.currency), id=self._cloudStableId("savingsContributions", c.id);
      rows.savings_contributions.push({id:id,user_id:uid,savings_goal_id:self._cloudStableId("savings", c.savings_goal_id),account_id:self._cloudAccountIdByName(snapshot,c.account,cur),amount_minor:Math.trunc(Number(c.amount_minor)||0),currency:cur,contribution_date:self._isoDateMaybe(c.date)||today,note:c.note||""});
    });
    (snapshot.pots||[]).forEach(function(g){
      var cur=self._rc(g), id=self._cloudStableId("pots", g.id||g.name);
      rows.purchase_goals.push({id:id,user_id:uid,item_name:g.name||"Cagnotte",description:g.description||"",target_amount_minor:Math.trunc(Number(g.target_amount_minor)||0),current_amount_minor:Math.trunc(Number(g.current_amount_minor)||0),currency:cur,target_date:self._isoDateMaybe(g.date),priority:g.priority||"Moyenne",status:g.status||"En cours",image_url:g.image_url||"",note:g.note||""});
    });
    (snapshot.purchaseContributions||[]).forEach(function(c){
      var cur=self._cur(c.currency), id=self._cloudStableId("purchaseContributions", c.id);
      rows.purchase_contributions.push({id:id,user_id:uid,purchase_goal_id:self._cloudStableId("pots", c.purchase_goal_id),account_id:self._cloudAccountIdByName(snapshot,c.account,cur),amount_minor:Math.trunc(Number(c.amount_minor)||0),currency:cur,contribution_date:self._isoDateMaybe(c.date)||today,note:c.note||""});
    });
    (snapshot.debts||[]).forEach(function(d){
      var cur=self._rc(d), id=self._cloudStableId("debts", d.id||d.name);
      rows.debts.push({id:id,user_id:uid,creditor_name:d.creditor||"",debt_name:d.name||"Dette",total_amount_minor:Math.trunc(Number(d.total_amount_minor)||0),paid_amount_minor:Math.trunc(Number(d.paid_amount_minor)||0),currency:cur,start_date:today,next_payment_date:self._isoDateMaybe(d.due),payment_frequency:d.freq||"",status:d.status||"A jour",note:d.note||""});
    });
    (snapshot.debtPayments||[]).forEach(function(p){
      var cur=self._cur(p.currency), id=self._cloudStableId("debtPayments", p.id);
      rows.debt_payments.push({id:id,user_id:uid,debt_id:self._cloudStableId("debts", p.debt_id),account_id:self._cloudAccountIdByName(snapshot,p.account,cur),amount_minor:Math.trunc(Number(p.amount_minor)||0),currency:cur,payment_date:self._isoDateMaybe(p.date)||today,note:p.note||""});
    });
    (snapshot.loans||[]).forEach(function(l){
      var cur=self._rc(l), id=self._cloudStableId("loans", l.id||l.name);
      rows.loans_given.push({id:id,user_id:uid,borrower_name:l.name||"",amount_lent_minor:Math.trunc(Number(l.amount_lent_minor)||0),amount_repaid_minor:Math.trunc(Number(l.amount_repaid_minor)||0),currency:cur,loan_date:today,expected_repayment_date:self._isoDateMaybe(l.due),repayment_frequency:l.freq||"",status:l.status||"En attente",note:l.note||""});
    });
    (snapshot.loanRepayments||[]).forEach(function(rp){
      var cur=self._cur(rp.currency), id=self._cloudStableId("loanRepayments", rp.id);
      rows.loan_repayments.push({id:id,user_id:uid,loan_id:self._cloudStableId("loans", rp.loan_id),account_id:self._cloudAccountIdByName(snapshot,rp.account,cur),amount_minor:Math.trunc(Number(rp.amount_minor)||0),currency:cur,repayment_date:self._isoDateMaybe(rp.date)||today,note:rp.note||""});
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
      .then(function(){ return self._cloudUpsert("loan_repayments", rows.loan_repayments); });
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
      this._selectAll("loan_repayments","created_at")
    ]).then(function(all){
      var accRows=all[0], accById={};
      var accounts=accRows.map(function(a){
        accById[a.id]=a;
        return {id:a.id,name:a.name,type:a.type||"Autre",balance_minor:a.balance_minor||0,currency:self._cur(a.currency),updated:"Cloud",linked:true,icon:self._iconForType(a.type||"Autre"),c:"#1E5081",b:"#EAF1F8"};
      });
      function accName(id){ return id && accById[id] ? accById[id].name : ""; }
      var snapshot={v:2,currency:self.state.currency,
        accounts:accounts,
        incomes:all[1].map(function(i){ return {id:i.id,source:i.source||"Autre",label:i.category||i.source||"Revenu",amount_minor:i.amount_minor||0,currency:self._cur(i.currency),freq:"Ponctuel",date:self._fullFromIso(i.income_date),month:self._monthFromIso(i.income_date),account:accName(i.account_id),note:i.note||""}; }),
        expenses:all[2].map(function(e){ return {id:e.id,cat:e.category||"Divers",payee:e.merchant||"Dépense",amount_minor:e.amount_minor||0,currency:self._cur(e.currency),method:e.payment_method||"",account:accName(e.account_id),date:self._shortFromIso(e.expense_date),month:self._monthFromIso(e.expense_date),proof:null,note:e.note||""}; }),
        savings:all[3].map(function(g){ return {id:g.id,name:g.name,target_amount_minor:g.target_amount_minor||0,current_amount_minor:g.current_amount_minor||0,currency:self._cur(g.currency),date:self._fullFromIso(g.target_date),status:g.status||"En cours",note:g.note||""}; }),
        savingsContributions:all[4].map(function(c){ return {id:c.id,savings_goal_id:c.savings_goal_id,account:accName(c.account_id),amount_minor:c.amount_minor||0,currency:self._cur(c.currency),date:self._fullFromIso(c.contribution_date),note:c.note||""}; }),
        pots:all[5].map(function(g){ return {id:g.id,name:g.item_name,target_amount_minor:g.target_amount_minor||0,current_amount_minor:g.current_amount_minor||0,currency:self._cur(g.currency),date:self._fullFromIso(g.target_date),priority:g.priority||"Moyenne",status:g.status||"En cours",note:g.note||""}; }),
        purchaseContributions:all[6].map(function(c){ return {id:c.id,purchase_goal_id:c.purchase_goal_id,account:accName(c.account_id),amount_minor:c.amount_minor||0,currency:self._cur(c.currency),date:self._fullFromIso(c.contribution_date),note:c.note||""}; }),
        debts:all[7].map(function(d){ return {id:d.id,name:d.debt_name||"Dette",creditor:d.creditor_name||"",total_amount_minor:d.total_amount_minor||0,paid_amount_minor:d.paid_amount_minor||0,currency:self._cur(d.currency),due:self._fullFromIso(d.next_payment_date),status:d.status||"A jour",note:d.note||""}; }),
        debtPayments:all[8].map(function(p){ return {id:p.id,debt_id:p.debt_id,account:accName(p.account_id),amount_minor:p.amount_minor||0,currency:self._cur(p.currency),date:self._fullFromIso(p.payment_date),note:p.note||""}; }),
        loans:all[9].map(function(l){ return {id:l.id,name:l.borrower_name||"",rel:"—",amount_lent_minor:l.amount_lent_minor||0,amount_repaid_minor:l.amount_repaid_minor||0,currency:self._cur(l.currency),due:self._fullFromIso(l.expected_repayment_date),status:l.status||"En attente",proof:false,note:l.note||""}; }),
        loanRepayments:all[10].map(function(r){ return {id:r.id,loan_id:r.loan_id,account:accName(r.account_id),amount_minor:r.amount_minor||0,currency:self._cur(r.currency),date:self._fullFromIso(r.repayment_date),note:r.note||""}; })
      };
      self._cloudApplySnapshot(snapshot);
      return snapshot;
    }).catch(function(e){ self._cloudHandleError("load", e); return null; });
  }
  _cloudParentMeta(parent){
    var p=String(parent||"").split(":");
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
    var self=this;
    if(!f || !f.cloud || !f.table) return Promise.resolve(null);
    return this.sb.storage.from("justificatifs").remove([f.path]).then(function(r){
      if(r.error) throw r.error;
      return self.sb.from(f.table).delete().eq("id",f.id);
    }).then(function(r){ if(r && r.error) throw r.error; return null; }).catch(function(e){ self._cloudHandleError("deleteFile", e); });
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
