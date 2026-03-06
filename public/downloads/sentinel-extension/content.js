(function(){"use strict";Object.entries({V01:{code:"V01",nameEn:"Trademark Infringement",nameKo:"상표권 침해",category:"intellectual_property",severity:"high"},V02:{code:"V02",nameEn:"Copyright Infringement",nameKo:"저작권 침해",category:"intellectual_property",severity:"high"},V03:{code:"V03",nameEn:"Patent Infringement",nameKo:"특허 침해",category:"intellectual_property",severity:"high"},V04:{code:"V04",nameEn:"Counterfeit Product",nameKo:"위조 상품",category:"intellectual_property",severity:"high"},V05:{code:"V05",nameEn:"False Advertising",nameKo:"허위 광고",category:"listing_content",severity:"medium"},V06:{code:"V06",nameEn:"Prohibited Keywords",nameKo:"금지 키워드",category:"listing_content",severity:"medium"},V07:{code:"V07",nameEn:"Inaccurate Product Info",nameKo:"부정확한 상품 정보",category:"listing_content",severity:"medium"},V08:{code:"V08",nameEn:"Image Policy Violation",nameKo:"이미지 정책 위반",category:"listing_content",severity:"medium"},V09:{code:"V09",nameEn:"Comparative Advertising",nameKo:"비교 광고",category:"listing_content",severity:"medium"},V10:{code:"V10",nameEn:"Variation Policy Violation",nameKo:"변형 정책 위반",category:"listing_content",severity:"medium"},V11:{code:"V11",nameEn:"Review Manipulation",nameKo:"리뷰 조작",category:"review_manipulation",severity:"high"},V12:{code:"V12",nameEn:"Review Hijacking",nameKo:"리뷰 하이재킹",category:"review_manipulation",severity:"high"},V13:{code:"V13",nameEn:"Price Manipulation",nameKo:"가격 조작",category:"selling_practice",severity:"medium"},V14:{code:"V14",nameEn:"Resale Violation",nameKo:"재판매 위반",category:"selling_practice",severity:"low"},V15:{code:"V15",nameEn:"Bundling Violation",nameKo:"번들링 위반",category:"selling_practice",severity:"low"},V16:{code:"V16",nameEn:"Missing Certification (FCC/UL)",nameKo:"인증 누락 (FCC/UL)",category:"regulatory_safety",severity:"high"},V17:{code:"V17",nameEn:"Safety Standards Failure",nameKo:"안전 기준 미달",category:"regulatory_safety",severity:"high"},V18:{code:"V18",nameEn:"Missing Warning Label",nameKo:"경고 라벨 누락",category:"regulatory_safety",severity:"medium"},V19:{code:"V19",nameEn:"Import Regulation Violation",nameKo:"수입 규정 위반",category:"regulatory_safety",severity:"medium"}}).reduce((e,[,t])=>{const n=e[t.category]??[];return n.push(t),e[t.category]=n,e},{});const m={"www.amazon.com":"US","www.amazon.co.uk":"UK","www.amazon.co.jp":"JP","www.amazon.de":"DE","www.amazon.fr":"FR","www.amazon.it":"IT","www.amazon.es":"ES","www.amazon.ca":"CA"},o=e=>{for(const t of e)try{const n=t();if(n!=null&&n!=="")return n}catch{}return null},a={asin:[()=>{var e;return(e=document.querySelector('input[name="ASIN"]'))==null?void 0:e.value},()=>{var e,t;return(t=(e=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i))==null?void 0:e[1])==null?void 0:t.toUpperCase()},()=>{var e,t;return(t=(e=window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i))==null?void 0:e[1])==null?void 0:t.toUpperCase()},()=>{var e,t;return(t=(e=window.location.pathname.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i))==null?void 0:e[1])==null?void 0:t.toUpperCase()},()=>{var e,t;return(t=(e=window.location.href.match(/(?:[?&]|%3[Ff])asin=([A-Z0-9]{10})/i))==null?void 0:e[1])==null?void 0:t.toUpperCase()},()=>{var e;return(e=document.querySelector("[data-asin]"))==null?void 0:e.getAttribute("data-asin")},()=>{var e;return(e=document.querySelector("[data-csa-c-asin]"))==null?void 0:e.getAttribute("data-csa-c-asin")}],title:[()=>{var e,t;return(t=(e=document.querySelector("#productTitle"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#title span"))==null?void 0:e.textContent)==null?void 0:t.trim()}],sellerName:[()=>{var e,t;return(t=(e=document.querySelector("#sellerProfileTriggerId"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#merchant-info a"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#tabular-buybox .tabular-buybox-text a"))==null?void 0:e.textContent)==null?void 0:t.trim()}],sellerId:[()=>{var t,n,r;const e=(t=document.querySelector("#sellerProfileTriggerId"))==null?void 0:t.closest("a");return((r=(n=e==null?void 0:e.getAttribute("href"))==null?void 0:n.match(/seller=([A-Z0-9]+)/))==null?void 0:r[1])??null}],price:[()=>{var e,t;return(t=(e=document.querySelector(".a-price .a-offscreen"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#priceblock_ourprice"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector(".a-price-whole"))==null?void 0:e.textContent)==null?void 0:t.trim()}],images:[()=>{const e=document.querySelectorAll("#altImages img, #imgTagWrapperId img");return Array.from(e).map(t=>t.src).filter(t=>t&&!t.includes("sprite")&&!t.includes("grey-pixel")).map(t=>t.replace(/\._[^.]+\./,"."))}],bulletPoints:[()=>{const e=document.querySelectorAll("#feature-bullets li span.a-list-item");return Array.from(e).map(t=>{var n;return(n=t.textContent)==null?void 0:n.trim()}).filter(t=>!!t&&t.length>1)}],brand:[()=>{var e,t;return(t=(e=document.querySelector("#bylineInfo"))==null?void 0:e.textContent)==null?void 0:t.replace(/^(Visit the |Brand: )/,"").trim()},()=>{var e,t;return(t=(e=document.querySelector(".po-brand .po-break-word"))==null?void 0:e.textContent)==null?void 0:t.trim()}],rating:[()=>{var n;const e=(n=document.querySelector("#acrPopover .a-icon-alt"))==null?void 0:n.textContent,t=e==null?void 0:e.match(/([\d.]+)\s+out of/);return t?parseFloat(t[1]):null}],reviewCount:[()=>{var n;const e=(n=document.querySelector("#acrCustomerReviewText"))==null?void 0:n.textContent,t=e==null?void 0:e.match(/([\d,]+)/);return t?parseInt(t[1].replace(/,/g,""),10):null}]},u=e=>{if(!e)return{amount:null,currency:"USD"};const t=e.replace(/[^\d.,]/g,""),n=parseFloat(t.replace(/,/g,"")),r=e.startsWith("$")?"USD":e.startsWith("£")?"GBP":e.startsWith("¥")?"JPY":e.includes("€")?"EUR":"USD";return{amount:isNaN(n)?null:n,currency:r}},i=()=>{const e=o(a.asin);if(!e)return null;const t=o(a.title)??"",n=o(a.price),{amount:r,currency:w}=u(n),_=m[window.location.hostname]??"US";return{asin:e,title:t,seller_name:o(a.sellerName),seller_id:o(a.sellerId),price_amount:r,price_currency:w,images:o(a.images)??[],bullet_points:o(a.bulletPoints)??[],brand:o(a.brand),rating:o(a.rating),review_count:o(a.reviewCount),url:window.location.href,marketplace:_}},c="sentinel-floating-btn",d=`
  :host {
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    font-family: Inter, system-ui, sans-serif;
  }
  .sentinel-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #F97316;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .sentinel-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(249, 115, 22, 0.5);
  }
  .sentinel-btn:active {
    transform: scale(0.95);
  }
  @keyframes sentinel-pulse {
    0% { box-shadow: 0 4px 12px rgba(249,115,22,0.4); }
    50% { box-shadow: 0 4px 24px rgba(249,115,22,0.7); }
    100% { box-shadow: 0 4px 12px rgba(249,115,22,0.4); }
  }
  .sentinel-btn--pulse {
    animation: sentinel-pulse 2s ease-in-out 3;
  }
  .sentinel-btn svg {
    width: 24px;
    height: 24px;
    fill: white;
  }
`,p=`
  <svg viewBox="0 0 24.8 28" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`,g=()=>{if(document.getElementById(c))return;const e=document.createElement("div");e.id=c;const t=e.attachShadow({mode:"closed"}),n=document.createElement("style");n.textContent=d;const r=document.createElement("button");r.className="sentinel-btn sentinel-btn--pulse",r.innerHTML=p,r.title="Report Violation — Sentinel",r.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"})}),t.appendChild(n),t.appendChild(r),document.body.appendChild(e)},s="__sentinel_content_injected__",y=()=>{var e;try{return!!((e=chrome.runtime)!=null&&e.id)}catch{return!1}},h=e=>{if(y())try{chrome.runtime.sendMessage(e,()=>{chrome.runtime.lastError})}catch{}},l=()=>{chrome.runtime.onMessage.addListener((e,t,n)=>{if(e.type==="GET_PAGE_DATA")try{const r=i();n({success:!!r,data:r})}catch{n({success:!1,data:null})}return!0})};if(window[s])l();else{window[s]=!0;const e=()=>{l();const t=i();t&&(g(),requestIdleCallback(()=>{const n={asin:t.asin,title:t.title,seller_name:t.seller_name,seller_id:t.seller_id,price_amount:t.price_amount,price_currency:t.price_currency,bullet_points:t.bullet_points,brand:t.brand,rating:t.rating,review_count:t.review_count,url:t.url,marketplace:t.marketplace};h({type:"PASSIVE_PAGE_DATA",data:n})}))};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e):e()}})();
