declare const SEARCH_SELECTORS: {
    readonly resultItems: "[data-component-type=\"s-search-result\"]";
    readonly asin: "[data-asin]";
    readonly title: "h2 a span";
    readonly price: ".a-price .a-offscreen";
    readonly image: ".s-image";
    readonly sponsored: ".puis-label-popover";
    readonly nextPage: ".s-pagination-next";
    readonly noResults: ".s-no-results-filler";
    readonly captcha: "#captchacharacters";
};
declare const DETAIL_SELECTORS: {
    readonly title: "#productTitle";
    readonly price: ".a-price .a-offscreen";
    readonly listPrice: ".a-text-price .a-offscreen";
    readonly description: "#productDescription";
    readonly bulletPoints: "#feature-bullets li span";
    readonly images: "#imgTagWrapperId img, #altImages .a-button-thumbnail img";
    readonly mainImage: "#landingImage";
    readonly sellerName: "#sellerProfileTriggerId, #merchant-info a";
    readonly sellerId: "#sellerProfileTriggerId";
    readonly brand: "#bylineInfo";
    readonly category: "#wayfinding-breadcrumbs_container li a";
    readonly rating: "#acrPopover .a-size-base";
    readonly reviewCount: "#acrCustomerReviewText";
    readonly unavailable: "#availability .a-color-state";
    readonly captcha: "#captchacharacters";
};
export { SEARCH_SELECTORS, DETAIL_SELECTORS };
//# sourceMappingURL=selectors.d.ts.map