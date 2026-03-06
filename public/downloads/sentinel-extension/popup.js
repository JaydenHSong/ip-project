import"./chunks/modulepreload-polyfill.js";import{V as G,a as U,W as Y}from"./chunks/constants.js";const k="ext.locale";let S="en";const D={"common.sentinel":"Sentinel","common.cancel":"Cancel","common.settings":"Settings","loading.text":"Loading...","login.title":"Sentinel","login.desc":"Sign in with your Spigen Google account to report violations.","login.desc.expired":"Your session has expired. Please sign in again to continue.","login.btn":"Sign in with Google","login.btn.loading":"Signing in...","login.error":"Sign in failed","form.seller":"Seller","form.violation":"Violation Type","form.category.placeholder":"Select Category","form.violation.placeholder":"Select Violation Type","form.note.label":"Note (optional)","form.note.placeholder":"Describe the violation...","form.submit":"Submit Report","form.submit.loading":"Submitting...","form.screenshot.hint":"Screenshot will be captured automatically.","form.error.submit":"Submission failed. Please try again.","preview.title":"Report Preview","preview.label.asin":"ASIN","preview.label.product":"Product","preview.label.marketplace":"Marketplace","preview.label.category":"Category","preview.label.violation":"Violation","preview.label.note":"Note","preview.label.screenshot":"Screenshot","preview.screenshot.auto":"Auto-attached","preview.countdown":"Sending automatically...","sending.title":"Sending Report...","sending.desc":"You can close this popup safely.<br/>The report will be sent in the background.","success.title":"Report Submitted!","success.desc":"Your violation report has been submitted successfully. The team will review it shortly.","success.duplicate":"A similar report already exists for this listing. Your report has been recorded for reference.","success.view":"View in Sentinel","success.another":"Report Another","settings.title":"Settings","settings.language":"Language","settings.theme":"Theme","settings.theme.light":"Light","settings.theme.dark":"Dark","settings.bgfetch.title":"Background ASIN Fetch","settings.bgfetch.toggle":"Enable Background Fetch","settings.bgfetch.hint1":"Sentinel automatically looks up ASINs in the background when requested from the web dashboard. A new tab opens briefly (~3s), collects product info, and closes automatically.","settings.bgfetch.hint2":"Your existing Amazon session is used. No additional login required.","settings.bgfetch.hint3":"Background Fetch is enabled by default.","error.not_amazon.title":"Not an Amazon Page","error.not_amazon.desc":"Open an Amazon product page to report a violation.","error.not_product.title":"Not a Product Page","error.not_product.desc":"Navigate to an individual product page (with /dp/ in the URL). Search and category pages are not supported.","error.parse.title":"Could Not Read Page","error.parse.desc":"Failed to extract product data. Try refreshing the page.","error.no_tab.title":"No Active Tab","error.no_tab.desc":"Could not detect the current tab. Try clicking the extension icon again.","error.connection.title":"Connection Error","error.connection.desc":"Could not connect to the extension background. Try reloading the extension.","bgfetch.banner":"Background Fetch","cat.intellectual_property":"Intellectual Property","cat.listing_content":"Listing Content","cat.review_manipulation":"Review Manipulation","cat.selling_practice":"Selling Practice","cat.regulatory_safety":"Regulatory / Safety"},K={"common.sentinel":"센티널","common.cancel":"취소","common.settings":"설정","loading.text":"로딩 중...","login.title":"Sentinel","login.desc":"Spigen Google 계정으로 로그인하여 위반을 신고하세요.","login.desc.expired":"세션이 만료되었습니다. 다시 로그인해 주세요.","login.btn":"Google로 로그인","login.btn.loading":"로그인 중...","login.error":"로그인 실패","form.seller":"판매자","form.violation":"위반 유형","form.category.placeholder":"카테고리 선택","form.violation.placeholder":"위반 유형 선택","form.note.label":"메모 (선택)","form.note.placeholder":"위반 사항을 설명하세요...","form.submit":"신고서 제출","form.submit.loading":"제출 중...","form.screenshot.hint":"스크린샷이 자동으로 캡처됩니다.","form.error.submit":"제출에 실패했습니다. 다시 시도해 주세요.","preview.title":"신고 미리보기","preview.label.asin":"ASIN","preview.label.product":"상품","preview.label.marketplace":"마켓플레이스","preview.label.category":"카테고리","preview.label.violation":"위반","preview.label.note":"메모","preview.label.screenshot":"스크린샷","preview.screenshot.auto":"자동 첨부","preview.countdown":"자동으로 전송됩니다...","sending.title":"신고서 전송 중...","sending.desc":"이 팝업을 닫아도 안전합니다.<br/>신고서는 백그라운드에서 전송됩니다.","success.title":"신고 완료!","success.desc":"위반 신고서가 성공적으로 제출되었습니다. 팀에서 곧 검토할 예정입니다.","success.duplicate":"이 리스팅에 대해 유사한 신고서가 이미 존재합니다. 귀하의 신고서는 참고용으로 기록되었습니다.","success.view":"Sentinel에서 보기","success.another":"추가 신고","settings.title":"설정","settings.language":"언어","settings.theme":"테마","settings.theme.light":"라이트","settings.theme.dark":"다크","settings.bgfetch.title":"백그라운드 ASIN 조회","settings.bgfetch.toggle":"백그라운드 조회 활성화","settings.bgfetch.hint1":"Sentinel이 웹 대시보드에서 요청 시 백그라운드에서 자동으로 ASIN을 조회합니다. 새 탭이 잠시(~3초) 열리고 상품 정보를 수집한 후 자동으로 닫힙니다.","settings.bgfetch.hint2":"기존 Amazon 세션이 사용됩니다. 추가 로그인이 필요하지 않습니다.","settings.bgfetch.hint3":"백그라운드 조회는 기본적으로 활성화되어 있습니다.","error.not_amazon.title":"아마존 페이지가 아닙니다","error.not_amazon.desc":"위반을 신고하려면 아마존 상품 페이지를 열어주세요.","error.not_product.title":"상품 페이지가 아닙니다","error.not_product.desc":"URL에 /dp/가 포함된 개별 상품 페이지로 이동해 주세요. 검색/카테고리 페이지는 지원되지 않습니다.","error.parse.title":"페이지를 읽을 수 없습니다","error.parse.desc":"상품 데이터 추출에 실패했습니다. 페이지를 새로고침해 보세요.","error.no_tab.title":"활성 탭 없음","error.no_tab.desc":"현재 탭을 감지할 수 없습니다. 확장 프로그램 아이콘을 다시 클릭해 보세요.","error.connection.title":"연결 오류","error.connection.desc":"확장 프로그램 백그라운드에 연결할 수 없습니다. 확장 프로그램을 다시 로드해 보세요.","bgfetch.banner":"백그라운드 조회","cat.intellectual_property":"지식재산권","cat.listing_content":"리스팅 콘텐츠","cat.review_manipulation":"리뷰 조작","cat.selling_practice":"판매 관행","cat.regulatory_safety":"규제 / 안전"},R={en:D,ko:K},n=e=>R[S][e]??R.en[e]??e,y=()=>S,j=e=>{S=e,chrome.storage.local.set({[k]:e})},W=()=>new Promise(e=>{chrome.storage.local.get(k,t=>{const s=t[k];(s==="ko"||s==="en")&&(S=s),e()})}),L="ext.theme";let E="light";const N=()=>E,Q=e=>{E=e,chrome.storage.local.set({[L]:e}),B(e)},B=e=>{document.documentElement.setAttribute("data-theme",e)},Z=()=>new Promise(e=>{chrome.storage.local.get(L,t=>{const s=t[L];(s==="light"||s==="dark")&&(E=s),B(E),e()})}),J=e=>{e.innerHTML=`
    <div class="status-message loading-view">
      <div class="loading-view__spinner"></div>
      <p class="status-message__desc">${n("loading.text")}</p>
    </div>
  `},X=`
  <svg class="login-logo" viewBox="0 0 24.8 28" fill="var(--accent)" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`,C=`
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
`,H=(e,t,s)=>{const i=n(s==="session_expired"?"login.desc.expired":"login.desc");e.innerHTML=`
    <div class="login-container">
      ${X}
      <h1 class="login-title">${n("login.title")}</h1>
      <p class="login-desc">${i}</p>
      <button id="btn-google-login" class="btn btn--ghost login-btn">
        ${C}
        ${n("login.btn")}
      </button>
      <div id="login-error" class="error-text hidden"></div>
    </div>
  `;const o=e.querySelector("#btn-google-login"),r=e.querySelector("#login-error");o.addEventListener("click",async()=>{o.disabled=!0,o.innerHTML=`<span class="spinner"></span> ${n("login.btn.loading")}`,r.classList.add("hidden"),chrome.runtime.sendMessage({type:"SIGN_IN"},c=>{c!=null&&c.success?t():(r.textContent=(c==null?void 0:c.error)??n("login.error"),r.classList.remove("hidden"),o.disabled=!1,o.innerHTML=`${C} ${n("login.btn")}`)})})},ee=["intellectual_property","listing_content","review_manipulation","selling_practice","regulatory_safety"],te=(e,t)=>{const s=y();e.innerHTML=`
    <div class="form-group">
      <label class="form-label form-label--required">${n("form.violation")}</label>
      <select id="select-category" class="form-select">
        <option value="">${n("form.category.placeholder")}</option>
        ${ee.map(r=>`<option value="${r}">${n(`cat.${r}`)}</option>`).join("")}
      </select>
      <select id="select-violation" class="form-select" disabled>
        <option value="">${n("form.violation.placeholder")}</option>
      </select>
    </div>
  `;const i=e.querySelector("#select-category"),o=e.querySelector("#select-violation");i.addEventListener("change",()=>{const r=i.value;if(!r){o.innerHTML=`<option value="">${n("form.violation.placeholder")}</option>`,o.disabled=!0,t(null,null);return}const c=G[r]??[],v=g=>s==="ko"?g.nameKo:g.nameEn;o.innerHTML=`
      <option value="">${n("form.violation.placeholder")}</option>
      ${c.map(g=>`<option value="${g.code}">${g.code} — ${v(g)}</option>`).join("")}
    `,o.disabled=!1,o.value="",t(null,r)}),o.addEventListener("change",()=>{const r=o.value,c=i.value;t(r||null,c||null)})},se=(e,t)=>{e.innerHTML=`
    <div class="form-group">
      <label class="form-label">${n("form.note.label")}</label>
      <textarea
        id="note-input"
        class="form-textarea"
        placeholder="${n("form.note.placeholder")}"
        rows="4"
        maxlength="2000"
      ></textarea>
    </div>
  `;const s=e.querySelector("#note-input");s.addEventListener("input",()=>{t(s.value)})},q=`
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
`,ne=(e,t)=>{e.innerHTML=`
    <button id="btn-submit" class="btn btn--primary" disabled>
      ${q}
      ${n("form.submit")}
    </button>
    <p class="hint-text">${n("form.screenshot.hint")}</p>
  `,e.querySelector("#btn-submit").addEventListener("click",t)},ie=e=>{const t=document.querySelector("#btn-submit");t&&(t.disabled=!e)},O=e=>{const t=document.querySelector("#btn-submit");t&&(e?(t.disabled=!0,t.innerHTML=`<span class="spinner"></span> ${n("form.submit.loading")}`):(t.disabled=!1,t.innerHTML=`${q} ${n("form.submit")}`))},p=e=>{const t=document.createElement("div");return t.textContent=e,t.innerHTML},oe=(e,t,s)=>{const i={violationType:null,violationCategory:null,note:""},o=p(t.marketplace);e.innerHTML=`
    <div class="popup-content">
      <div class="product-info">
        <span class="product-info__asin">${p(t.asin)}</span>
        <p class="product-info__title">${p(t.title)}</p>
        ${t.seller_name?`<span class="product-info__seller">${n("form.seller")}: ${p(t.seller_name)}</span>`:""}
        <span class="product-info__marketplace">${o}</span>
      </div>
      <div id="violation-selector"></div>
      <div id="note-input"></div>
      <div id="submit-area"></div>
      <div id="form-error" class="error-text hidden"></div>
    </div>
  `;const r=e.querySelector("#violation-selector"),c=e.querySelector("#note-input"),v=e.querySelector("#submit-area"),g=e.querySelector("#form-error"),m=()=>{ie(i.violationType!==null)};te(r,(a,u)=>{i.violationType=a,i.violationCategory=u,m()}),se(c,a=>{i.note=a}),ne(v,async()=>{if(!i.violationType||!i.violationCategory)return;O(!0),g.classList.add("hidden");const a=await new Promise(w=>{chrome.runtime.sendMessage({type:"CAPTURE_SCREENSHOT"},w)}),u=a.success?a.data:"";O(!1),s({pageData:t,violationType:i.violationType,violationCategory:i.violationCategory,note:i.note,screenshotBase64:u})})},h=3,I=188.5,re=(e,t,s,i)=>{const o=U[t.violationType],r=y()==="ko"?o.nameKo:o.nameEn,c=`cat.${t.violationCategory}`;e.innerHTML=`
    <div class="preview-container">
      <h2 class="preview-header">${n("preview.title")}</h2>

      <div class="preview-card">
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.asin")}</span>
          <span class="preview-card__value preview-card__value--accent">${p(t.pageData.asin)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.product")}</span>
          <span class="preview-card__value preview-card__value--title">${p(t.pageData.title)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.marketplace")}</span>
          <span class="preview-card__value">${p(t.pageData.marketplace)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.category")}</span>
          <span class="preview-card__value">${n(c)}</span>
        </div>
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.violation")}</span>
          <span class="preview-card__value">${p(o.code)} &mdash; ${p(r)}</span>
        </div>
        ${t.note?`
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.note")}</span>
          <span class="preview-card__value preview-card__value--note">${p(t.note)}</span>
        </div>
        `:""}
        <div class="preview-card__row">
          <span class="preview-card__label">${n("preview.label.screenshot")}</span>
          <span class="preview-card__value preview-card__value--muted">${n("preview.screenshot.auto")}</span>
        </div>
      </div>

      <div class="countdown-area">
        <svg class="countdown-ring" viewBox="0 0 64 64">
          <circle class="countdown-ring__bg" cx="32" cy="32" r="30" fill="none" stroke="var(--border)" stroke-width="3" />
          <circle id="countdown-circle" class="countdown-ring__circle" cx="32" cy="32" r="30" fill="none" stroke="var(--accent)" stroke-width="3"
            stroke-dasharray="${I}" stroke-dashoffset="0"
            stroke-linecap="round" />
          <text id="countdown-text" class="countdown-ring__text" x="32" y="36" text-anchor="middle" fill="var(--text-primary)" font-size="16" font-weight="600">${h}</text>
        </svg>
        <p class="countdown-label">${n("preview.countdown")}</p>
      </div>

      <button id="btn-preview-cancel" class="btn btn--ghost">${n("common.cancel")}</button>
    </div>
  `;const v=e.querySelector("#countdown-circle"),g=e.querySelector("#countdown-text"),m=e.querySelector("#btn-preview-cancel");let a=0,u=!1;chrome.runtime.sendMessage({type:"PREPARE_REPORT",payload:{page_data:t.pageData,violation_type:t.violationType,violation_category:t.violationCategory,note:t.note,screenshot_base64:t.screenshotBase64}});const w=setInterval(()=>{if(u)return;a+=100;const F=a/(h*1e3);v.setAttribute("stroke-dashoffset",String(I*F));const z=Math.ceil((h*1e3-a)/1e3);g.textContent=String(z),a>=h*1e3&&(clearInterval(w),s())},100);m.addEventListener("click",()=>{u=!0,clearInterval(w);try{chrome.storage.session.remove("pending_report")}catch{}i()}),window.addEventListener("beforeunload",()=>{if(!u&&a<h*1e3)try{chrome.runtime.sendMessage({type:"CONFIRM_REPORT"})}catch{}})},ae=e=>{e.innerHTML=`
    <div class="status-message sending-view">
      <div class="sending-view__spinner"></div>
      <h2 class="status-message__title">${n("sending.title")}</h2>
      <p class="status-message__desc">${n("sending.desc")}</p>
    </div>
  `},ce=`
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
`,le=(e,t,s=!1)=>{const i=`${Y}/reports/${t}`;e.innerHTML=`
    <div class="status-message success-view">
      <div class="success-check success-check--animated">
        ${ce}
      </div>
      <h2 class="status-message__title">${n("success.title")}</h2>
      ${s?`
        <p class="status-message__desc status-message__desc--warn">
          ${n("success.duplicate")}
        </p>
      `:`
        <p class="status-message__desc">
          ${n("success.desc")}
        </p>
      `}
      <a href="${i}" target="_blank" rel="noopener" class="btn btn--ghost success-view__btn">
        ${n("success.view")}
      </a>
      <button id="btn-new-report" class="btn btn--primary success-view__btn">
        ${n("success.another")}
      </button>
    </div>
  `},A=(e,t,s)=>{chrome.storage.local.get(["bgfetch.settings"],i=>{var g,m;const o=i["bgfetch.settings"]??{enabled:!0},r=y(),c=N();e.innerHTML=`
      <div class="settings-container">
        <div class="settings-header">
          <button id="btn-settings-back" class="settings-header__back">&larr;</button>
          <h2 class="settings-header__title">${n("settings.title")}</h2>
        </div>

        <div class="settings-section">
          <h3 class="settings-section__title">${n("settings.language")}</h3>
          <div class="settings-lang-switcher">
            <button class="settings-lang-btn ${r==="en"?"settings-lang-btn--active":""}" data-lang="en">EN</button>
            <button class="settings-lang-btn ${r==="ko"?"settings-lang-btn--active":""}" data-lang="ko">KO</button>
          </div>
        </div>

        <div class="settings-divider"></div>

        <div class="settings-section">
          <h3 class="settings-section__title">${n("settings.theme")}</h3>
          <div class="settings-lang-switcher">
            <button class="settings-lang-btn settings-theme-btn ${c==="light"?"settings-lang-btn--active":""}" data-theme="light">☀️ ${n("settings.theme.light")}</button>
            <button class="settings-lang-btn settings-theme-btn ${c==="dark"?"settings-lang-btn--active":""}" data-theme="dark">🌙 ${n("settings.theme.dark")}</button>
          </div>
        </div>

        <div class="settings-divider"></div>

        <div class="settings-section">
          <h3 class="settings-section__title">${n("settings.bgfetch.title")}</h3>

          <label class="settings-toggle-row">
            <span class="toggle-switch">
              <input type="checkbox" id="bgfetch-toggle" ${o.enabled?"checked":""} />
              <span class="toggle-switch__slider"></span>
            </span>
            <span class="settings-toggle-row__label">${n("settings.bgfetch.toggle")}</span>
          </label>

          <p class="settings-hint">${n("settings.bgfetch.hint1")}</p>
          <p class="settings-hint" style="margin-top:4px">${n("settings.bgfetch.hint2")}</p>
          <p class="settings-hint settings-hint--info" style="margin-top:4px">${n("settings.bgfetch.hint3")}</p>
        </div>
      </div>
    `,(g=e.querySelector("#btn-settings-back"))==null||g.addEventListener("click",t),e.querySelectorAll(".settings-lang-btn").forEach(a=>{a.addEventListener("click",()=>{const u=a.dataset.lang;u!==y()&&(j(u),A(e,t,s),s==null||s())})}),e.querySelectorAll(".settings-theme-btn").forEach(a=>{a.addEventListener("click",()=>{const u=a.dataset.theme;u!==N()&&(Q(u),A(e,t,s))})});const v=()=>{const a=e.querySelector("#bgfetch-toggle");chrome.storage.local.set({"bgfetch.settings":{enabled:(a==null?void 0:a.checked)??!1}})};(m=e.querySelector("#bgfetch-toggle"))==null||m.addEventListener("change",v)})},l={loading:document.getElementById("view-loading"),login:document.getElementById("view-login"),form:document.getElementById("view-form"),preview:document.getElementById("view-preview"),sending:document.getElementById("view-sending"),success:document.getElementById("view-success"),settings:document.getElementById("view-settings")},d=e=>{for(const[t,s]of Object.entries(l))s&&s.classList.toggle("view--active",t===e)},x=e=>{const t=document.getElementById("user-avatar");t&&(e!=null&&e.avatar_url?(t.src=e.avatar_url,t.alt=e.name,t.classList.remove("hidden")):t.classList.add("hidden"))},de=1e4,M=e=>new Promise(t=>{const s=setTimeout(()=>{t({success:!1,error:"Service worker not responding. Try again."})},de);try{chrome.runtime.sendMessage(e,i=>{if(clearTimeout(s),chrome.runtime.lastError){t({success:!1,error:chrome.runtime.lastError.message??"Connection lost"});return}t(i??{success:!1,error:"No response from background"})})}catch{clearTimeout(s),t({success:!1,error:"Failed to connect to background"})}}),P={NOT_AMAZON:{title:"error.not_amazon.title",desc:"error.not_amazon.desc",icon:"🌐"},NOT_PRODUCT_PAGE:{title:"error.not_product.title",desc:"error.not_product.desc",icon:"🔍"},PARSE_FAILED:{title:"error.parse.title",desc:"error.parse.desc",icon:"⚠️"},NO_TAB:{title:"error.no_tab.title",desc:"error.no_tab.desc",icon:"📑"},CONNECTION_ERROR:{title:"error.connection.title",desc:"error.connection.desc",icon:"🔌"}},b=(e,t)=>{const s=t.startsWith("PARSE_FAILED")?"PARSE_FAILED":t,i=P[s]??P.PARSE_FAILED,o=t.startsWith("PARSE_FAILED:")?t.substring(13):"";e.innerHTML=`
    <div class="status-message error-view">
      <div class="error-view__icon">${i.icon}</div>
      <h2 class="status-message__title">${n(i.title)}</h2>
      <p class="status-message__desc">${n(i.desc)}</p>
      ${o?`<p class="status-message__desc" style="font-size:11px;color:var(--text-muted);word-break:break-all;margin-top:8px">${o}</p>`:""}
    </div>
  `},ge=e=>{d("sending"),ae(l.sending);const t=setTimeout(()=>{d("form"),b(l.form,"CONNECTION_ERROR")},15e3);try{chrome.runtime.sendMessage({type:"QUEUE_REPORT",payload:{page_data:e.pageData,violation_type:e.violationType,violation_category:e.violationCategory,note:e.note,screenshot_base64:e.screenshotBase64}},s=>{var i,o;if(clearTimeout(t),chrome.runtime.lastError){d("form"),b(l.form,"CONNECTION_ERROR");return}if(s!=null&&s.success){d("success"),le(l.success,s.data.report_id,s.data.is_duplicate);const r=l.success.querySelector("#btn-new-report");r==null||r.addEventListener("click",()=>_())}else{if(((i=s==null?void 0:s.error)==null?void 0:i.toLowerCase().includes("session expired"))||((o=s==null?void 0:s.error)==null?void 0:o.toLowerCase().includes("not authenticated"))){x(null),d("login"),H(l.login,()=>_(),"session_expired");return}d("form");const c=l.form.querySelector("#form-error");c&&(c.textContent=(s==null?void 0:s.error)??n("form.error.submit"),c.classList.remove("hidden"))}})}catch{clearTimeout(t),d("form"),b(l.form,"CONNECTION_ERROR")}},_=async()=>{var e;try{d("loading"),J(l.loading);const t=await M({type:"GET_AUTH_STATUS"});if(!t.success||!((e=t.data)!=null&&e.authenticated)){x(null),d("login"),H(l.login,()=>_());return}x(t.data.user);const s=await M({type:"GET_PAGE_DATA_FROM_TAB"});if(!s.success||!s.data){d("form"),b(l.form,(s.success?null:s.error)??"PARSE_FAILED");return}d("form"),oe(l.form,s.data,i=>{d("preview"),re(l.preview,i,()=>ge(i),()=>{d("form")})})}catch{d("form"),b(l.form,"CONNECTION_ERROR")}};let $="form";const T=document.getElementById("btn-settings");T==null||T.addEventListener("click",()=>{var t;if((t=l.settings)==null?void 0:t.classList.contains("view--active"))d($);else{for(const[s,i]of Object.entries(l))if(i!=null&&i.classList.contains("view--active")&&s!=="settings"){$=s;break}d("settings"),A(l.settings,()=>{d($)},()=>{_()})}});const f=document.getElementById("bgfetch-banner"),V=()=>{chrome.storage.local.get("bgfetch.status",e=>{const t=e["bgfetch.status"];f&&(t!=null&&t.active&&t.asin?(f.textContent=`${n("bgfetch.banner")}: ${t.asin} (${t.marketplace??"US"})`,f.classList.remove("hidden")):f.classList.add("hidden"))})};V();chrome.storage.onChanged.addListener(e=>{e["bgfetch.status"]&&V()});Promise.all([W(),Z()]).then(()=>_());
