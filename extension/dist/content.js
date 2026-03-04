import{M as d}from"./chunks/constants.js";const o=e=>{for(const t of e)try{const n=t();if(n!=null&&n!=="")return n}catch{}return null},c={asin:[()=>{var e;return(e=document.querySelector('input[name="ASIN"]'))==null?void 0:e.value},()=>{var e;return(e=window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/))==null?void 0:e[1]},()=>{var e;return(e=document.querySelector("[data-asin]"))==null?void 0:e.getAttribute("data-asin")}],title:[()=>{var e,t;return(t=(e=document.querySelector("#productTitle"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#title span"))==null?void 0:e.textContent)==null?void 0:t.trim()}],sellerName:[()=>{var e,t;return(t=(e=document.querySelector("#sellerProfileTriggerId"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#merchant-info a"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#tabular-buybox .tabular-buybox-text a"))==null?void 0:e.textContent)==null?void 0:t.trim()}],sellerId:[()=>{var t,n,r;const e=(t=document.querySelector("#sellerProfileTriggerId"))==null?void 0:t.closest("a");return((r=(n=e==null?void 0:e.getAttribute("href"))==null?void 0:n.match(/seller=([A-Z0-9]+)/))==null?void 0:r[1])??null}],price:[()=>{var e,t;return(t=(e=document.querySelector(".a-price .a-offscreen"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector("#priceblock_ourprice"))==null?void 0:e.textContent)==null?void 0:t.trim()},()=>{var e,t;return(t=(e=document.querySelector(".a-price-whole"))==null?void 0:e.textContent)==null?void 0:t.trim()}],images:[()=>{const e=document.querySelectorAll("#altImages img, #imgTagWrapperId img");return Array.from(e).map(t=>t.src).filter(t=>t&&!t.includes("sprite")&&!t.includes("grey-pixel")).map(t=>t.replace(/\._[^.]+\./,"."))}],bulletPoints:[()=>{const e=document.querySelectorAll("#feature-bullets li span.a-list-item");return Array.from(e).map(t=>{var n;return(n=t.textContent)==null?void 0:n.trim()}).filter(t=>!!t&&t.length>1)}],brand:[()=>{var e,t;return(t=(e=document.querySelector("#bylineInfo"))==null?void 0:e.textContent)==null?void 0:t.replace(/^(Visit the |Brand: )/,"").trim()},()=>{var e,t;return(t=(e=document.querySelector(".po-brand .po-break-word"))==null?void 0:e.textContent)==null?void 0:t.trim()}],rating:[()=>{var n;const e=(n=document.querySelector("#acrPopover .a-icon-alt"))==null?void 0:n.textContent,t=e==null?void 0:e.match(/([\d.]+)\s+out of/);return t?parseFloat(t[1]):null}],reviewCount:[()=>{var n;const e=(n=document.querySelector("#acrCustomerReviewText"))==null?void 0:n.textContent,t=e==null?void 0:e.match(/([\d,]+)/);return t?parseInt(t[1].replace(/,/g,""),10):null}]},m=e=>{if(!e)return{amount:null,currency:"USD"};const t=e.replace(/[^\d.,]/g,""),n=parseFloat(t.replace(/,/g,"")),r=e.startsWith("$")?"USD":e.startsWith("£")?"GBP":e.startsWith("¥")?"JPY":e.includes("€")?"EUR":"USD";return{amount:isNaN(n)?null:n,currency:r}},l=()=>{const e=o(c.asin);if(!e)return null;const t=o(c.title)??"",n=o(c.price),{amount:r,currency:a}=m(n),u=d[window.location.hostname]??"US";return{asin:e,title:t,seller_name:o(c.sellerName),seller_id:o(c.sellerId),price_amount:r,price_currency:a,images:o(c.images)??[],bullet_points:o(c.bulletPoints)??[],brand:o(c.brand),rating:o(c.rating),review_count:o(c.reviewCount),url:window.location.href,marketplace:u}},i="sentinel-floating-btn",p=`
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
  .sentinel-btn svg {
    width: 24px;
    height: 24px;
    fill: white;
  }
`,g=`
  <svg viewBox="0 0 24.8 28" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M14,0c2.6,0,4.6,2.1,4.6,4.7S16.5,9.3,14,9.3c-2.6,0-4.7,2.1-4.7,4.7s2,4.8,4.7,4.8s4.6,2.1,4.6,4.6c0,2.6-2.1,4.6-4.6,4.6c-2.6,0-4.7-2.1-4.7-4.6c0-2.6-2.1-4.6-4.6-4.6l0,0c-2.6,0-4.6-2.1-4.6-4.7s2.1-4.6,4.7-4.6l0,0c2.6,0,4.6-2.1,4.6-4.7C9.3,2.1,11.4,0,14,0z"/>
    <path d="M21,10.2c2.1,0,3.8,1.7,3.8,3.7c0,2.1-1.7,3.8-3.8,3.8s-3.7-1.7-3.7-3.8C17.2,11.9,18.9,10.2,21,10.2z"/>
  </svg>
`,h=()=>{if(document.getElementById(i))return;const e=document.createElement("div");e.id=i;const t=e.attachShadow({mode:"closed"}),n=document.createElement("style");n.textContent=p;const r=document.createElement("button");r.className="sentinel-btn",r.innerHTML=g,r.title="Report Violation — Sentinel",r.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"})}),t.appendChild(n),t.appendChild(r),document.body.appendChild(e)},s=()=>{const e=l();e&&(h(),chrome.runtime.onMessage.addListener((t,n,r)=>{if(t.type==="GET_PAGE_DATA"){const a=l();r({success:!0,data:a})}return!0}),requestIdleCallback(()=>{try{const t={asin:e.asin,title:e.title,seller_name:e.seller_name,seller_id:e.seller_id,price_amount:e.price_amount,price_currency:e.price_currency,bullet_points:e.bullet_points,brand:e.brand,rating:e.rating,review_count:e.review_count,url:e.url,marketplace:e.marketplace};chrome.runtime.sendMessage({type:"PASSIVE_PAGE_DATA",data:t})}catch{}}))};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",s):s();
