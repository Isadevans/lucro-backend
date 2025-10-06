// import type { Core } from '@strapi/strapi';
import { Server as SocketIOServer } from 'socket.io';
import {Core} from "@strapi/strapi";


export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap( { strapi }: { strapi: Core.Strapi } ) {
    const io = new SocketIOServer(strapi.server.httpServer, {
      cors: {
        origin: '*', // Replace with your frontend origin
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      strapi.log.info('A user connected');
      socket.on('join-room', (documentId: string) => {
        strapi.log.info(`Socket ${socket.id} is joining room ${documentId}`);
        socket.join(documentId);
      });

      socket.on('disconnect', () => {
        strapi.log.info('User disconnected');
      });

      // Handle custom events
    });
// @ts-ignore
    strapi.io = io; // Attach the Socket.IO instance to strapi

  },
};
