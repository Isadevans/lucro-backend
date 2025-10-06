export default {
  routes: [
    {
     method: 'POST',
     path: '/blackout/webhook',
     handler: 'blackout.webhook',
     config: {
       policies: [],
       middlewares: [],
     },
    },
  ],
};
