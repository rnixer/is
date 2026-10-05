export default {
  routes: [
    {
      method: 'GET',
      path: '/store/catalog',
      handler: 'api::commerce.commerce.catalog',
      config: { auth: false, policies: ['global::storefront'] },
    },
    {
      method: 'POST',
      path: '/store/checkout',
      handler: 'api::commerce.commerce.checkout',
      config: { auth: false, policies: ['global::storefront'] },
    },
    {
      method: 'POST',
      path: '/store/order-status',
      handler: 'api::commerce.commerce.status',
      config: { auth: false, policies: ['global::storefront'] },
    },
    {
      method: 'POST',
      path: '/stripe/webhook',
      handler: 'api::commerce.commerce.webhook',
      config: { auth: false },
    },
  ],
};
