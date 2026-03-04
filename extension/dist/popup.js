import{V as _,a as x,W as L}from"./chunks/constants.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const l of i.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&o(l)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const E=e=>{e.innerHTML=`
    <div class="status-message">
      <div class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></div>
      <p class="status-message__desc">Loading...</p>
    </div>
  `},T=`
  <svg class="login-logo" viewBox="0 0 24.8 28" fill="#F97316" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`,f=`
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
`,M=(e,t)=>{e.innerHTML=`
    <div class="login-container">
      ${T}
      <h1 class="login-title">Sentinel</h1>
      <p class="login-desc">Sign in with your Spigen Google account to report violations.</p>
      <button id="btn-google-login" class="btn btn--ghost" style="max-width: 280px;">
        ${f}
        Sign in with Google
      </button>
      <div id="login-error" class="error-text" style="display: none;"></div>
    </div>
  `;const n=e.querySelector("#btn-google-login"),o=e.querySelector("#login-error");n.addEventListener("click",async()=>{n.disabled=!0,n.innerHTML='<span class="spinner"></span> Signing in...',o.style.display="none",chrome.runtime.sendMessage({type:"SIGN_IN"},s=>{s!=null&&s.success?t():(o.textContent=(s==null?void 0:s.error)??"Sign in failed",o.style.display="block",n.disabled=!1,n.innerHTML=`${f} Sign in with Google`)})})},A=(e,t)=>{e.innerHTML=`
    <div class="form-group">
      <label class="form-label form-label--required">Violation Type</label>
      <select id="select-category" class="form-select">
        <option value="">Select Category</option>
        ${Object.entries(_).map(([s,i])=>`<option value="${s}">${i}</option>`).join("")}
      </select>
      <select id="select-violation" class="form-select" disabled>
        <option value="">Select Violation Type</option>
      </select>
    </div>
  `;const n=e.querySelector("#select-category"),o=e.querySelector("#select-violation");n.addEventListener("change",()=>{const s=n.value;if(!s){o.innerHTML='<option value="">Select Violation Type</option>',o.disabled=!0,t(null,null);return}const i=x[s]??[];o.innerHTML=`
      <option value="">Select Violation Type</option>
      ${i.map(l=>`<option value="${l.code}">${l.code} — ${l.nameEn}</option>`).join("")}
    `,o.disabled=!1,o.value="",t(null,s)}),o.addEventListener("change",()=>{const s=o.value,i=n.value;t(s||null,i||null)})},$=(e,t)=>{e.innerHTML=`
    <div class="form-group">
      <label class="form-label">Note (optional)</label>
      <textarea
        id="note-input"
        class="form-textarea"
        placeholder="Describe the violation..."
        rows="4"
        maxlength="2000"
      ></textarea>
    </div>
  `;const n=e.querySelector("#note-input");n.addEventListener("input",()=>{t(n.value)})},w=`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
`,C=(e,t)=>{e.innerHTML=`
    <button id="btn-submit" class="btn btn--primary" disabled>
      ${w}
      Submit Report
    </button>
    <p class="hint-text">Screenshot will be captured automatically.</p>
  `,e.querySelector("#btn-submit").addEventListener("click",t)},k=e=>{const t=document.querySelector("#btn-submit");t&&(t.disabled=!e)},h=e=>{const t=document.querySelector("#btn-submit");t&&(e?(t.disabled=!0,t.innerHTML='<span class="spinner"></span> Submitting...'):(t.disabled=!1,t.innerHTML=`${w} Submit Report`))},v=e=>{const t=document.createElement("div");return t.textContent=e,t.innerHTML},q=(e,t,n)=>{const o={violationType:null,violationCategory:null,note:""},s=v(t.marketplace);e.innerHTML=`
    <div class="popup-content">
      <div class="product-info">
        <span class="product-info__asin">${v(t.asin)}</span>
        <p class="product-info__title">${v(t.title)}</p>
        ${t.seller_name?`<span class="product-info__seller">Seller: ${v(t.seller_name)}</span>`:""}
        <span class="product-info__marketplace">${s}</span>
      </div>
      <div id="violation-selector"></div>
      <div id="note-input"></div>
      <div id="submit-area"></div>
      <div id="form-error" class="error-text hidden"></div>
    </div>
  `;const i=e.querySelector("#violation-selector"),l=e.querySelector("#note-input"),m=e.querySelector("#submit-area"),u=e.querySelector("#form-error"),g=()=>{k(o.violationType!==null)};A(i,(c,d)=>{o.violationType=c,o.violationCategory=d,g()}),$(l,c=>{o.note=c}),C(m,async()=>{if(!o.violationType||!o.violationCategory)return;h(!0),u.classList.add("hidden");const c=await new Promise(a=>{chrome.runtime.sendMessage({type:"CAPTURE_SCREENSHOT"},a)}),d=c.success?c.data:"";chrome.runtime.sendMessage({type:"SUBMIT_REPORT",payload:{page_data:t,violation_type:o.violationType,violation_category:o.violationCategory,note:o.note,screenshot_base64:d}},a=>{h(!1),a!=null&&a.success?n(a.data.report_id):(u.textContent=(a==null?void 0:a.error)??"Submission failed. Please try again.",u.classList.remove("hidden"))})})},H=`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`,O=(e,t)=>{const n=`${L}/reports/${t}`;e.innerHTML=`
    <div class="status-message success-view">
      <div class="success-check">
        ${H}
      </div>
      <h2 class="status-message__title">Report Submitted</h2>
      <p class="status-message__desc">
        Your violation report has been submitted successfully. The team will review it shortly.
      </p>
      <a href="${n}" target="_blank" rel="noopener" class="btn btn--ghost success-view__btn">
        View in Sentinel
      </a>
      <button id="btn-new-report" class="btn btn--primary success-view__btn">
        Report Another
      </button>
    </div>
  `},I={autoSubmitEnabled:!1,countdownSeconds:3,minDelaySec:30},V=(e,t)=>{chrome.storage.local.get(["sc_auto_settings"],n=>{var i,l,m,u;const o=n.sc_auto_settings??I;e.innerHTML=`
      <div style="padding: 12px 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <button id="btn-settings-back" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px;">
            &larr;
          </button>
          <h2 style="margin: 0; font-size: 15px; font-weight: 600;">SC Auto Submit</h2>
        </div>

        <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; cursor: pointer;">
          <input type="checkbox" id="auto-submit-toggle" ${o.autoSubmitEnabled?"checked":""} />
          <span style="font-size: 13px;">Enable Auto Submit</span>
        </label>

        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">Countdown (seconds)</label>
          <select id="countdown-select" style="width: 100%; padding: 6px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a2e; color: #fff; font-size: 13px;">
            <option value="3" ${o.countdownSeconds===3?"selected":""}>3 seconds</option>
            <option value="5" ${o.countdownSeconds===5?"selected":""}>5 seconds</option>
            <option value="10" ${o.countdownSeconds===10?"selected":""}>10 seconds</option>
          </select>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-size: 12px; color: #888; display: block; margin-bottom: 4px;">Batch Delay</label>
          <select id="delay-select" style="width: 100%; padding: 6px 8px; border: 1px solid #444; border-radius: 6px; background: #1a1a2e; color: #fff; font-size: 13px;">
            <option value="30" ${o.minDelaySec===30?"selected":""}>30~60s</option>
            <option value="60" ${o.minDelaySec===60?"selected":""}>60~90s</option>
            <option value="90" ${o.minDelaySec===90?"selected":""}>90~120s</option>
          </select>
        </div>

        <p style="font-size: 11px; color: #666; margin: 0;">
          Auto submit also requires Admin to enable it in Sentinel Web Settings.
        </p>
      </div>
    `,(i=e.querySelector("#btn-settings-back"))==null||i.addEventListener("click",t);const s=()=>{const g=e.querySelector("#auto-submit-toggle"),c=e.querySelector("#countdown-select"),d=e.querySelector("#delay-select"),a=Number((d==null?void 0:d.value)??30);chrome.storage.local.set({sc_auto_settings:{autoSubmitEnabled:(g==null?void 0:g.checked)??!1,countdownSeconds:Number((c==null?void 0:c.value)??3),minDelaySec:a,maxDelaySec:a+30}})};(l=e.querySelector("#auto-submit-toggle"))==null||l.addEventListener("change",s),(m=e.querySelector("#countdown-select"))==null||m.addEventListener("change",s),(u=e.querySelector("#delay-select"))==null||u.addEventListener("change",s)})},r={loading:document.getElementById("view-loading"),login:document.getElementById("view-login"),form:document.getElementById("view-form"),success:document.getElementById("view-success"),settings:document.getElementById("view-settings")},p=e=>{for(const[t,n]of Object.entries(r))n&&n.classList.toggle("view--active",t===e)},z=e=>{const t=document.getElementById("user-avatar");t&&(e!=null&&e.avatar_url?(t.src=e.avatar_url,t.alt=e.name,t.classList.remove("hidden")):t.classList.add("hidden"))},S=e=>new Promise(t=>{chrome.runtime.sendMessage(e,t)}),B=e=>{e.innerHTML=`
    <div class="status-message">
      <div class="status-message__icon">&#128722;</div>
      <h2 class="status-message__title">Not an Amazon Product Page</h2>
      <p class="status-message__desc">
        Navigate to an Amazon product page (e.g., amazon.com/dp/...) to report a violation.
      </p>
    </div>
  `},b=async()=>{p("loading"),E(r.loading);const e=await S({type:"GET_AUTH_STATUS"});if(!e.success||!e.data.authenticated){p("login"),M(r.login,()=>{b()});return}z(e.data.user);const t=await S({type:"GET_PAGE_DATA_FROM_TAB"});if(!t.success||!t.data){p("form"),B(r.form);return}p("form"),q(r.form,t.data,n=>{p("success"),O(r.success,n);const o=r.success.querySelector("#btn-new-report");o==null||o.addEventListener("click",()=>b())})},y=document.getElementById("btn-settings");y==null||y.addEventListener("click",()=>{p("settings"),V(r.settings,()=>{b()})});b();
