import mediasoup, { type types } from 'mediasoup';
import { ServiceError } from '../base.js';

class MediasoupWorkerManager {
  workers = new Array<types.Worker>();

  async init() {
    const numWorkers = Number(process.env.MEDIASOUP_NUMBER_OF_WORKERS || '1');

    for (let i = 0; i < numWorkers; ++i) {
      const worker = await mediasoup.createWorker({
        logLevel: process.env.MEDIASOUP_LOG_LEVEL as any,
        logTags: (process.env.MEDIASOUP_LOG_TAGS || ' ').split(' ') as any,
        rtcMinPort: Number(process.env.MEDIASOUP_RTC_MIN_PORT) || 20000,
        rtcMaxPort: Number(process.env.MEDIASOUP_RTC_MAX_PORT) || 40000,
      });

      worker.on('died', (e) => {
        console.error(e);
      });

      this.workers.push(worker);
      if (process.env.MEDIASOUP_USE_WEBRTC_SERVER !== 'false') {
        // Each mediasoup Worker will run its own WebRtcServer, so those cannot
        // share the same listening ports. Hence we increase the value in config.js
        // for each Worker.
        //const webRtcServerOptions = utils.clone(config.mediasoup.webRtcServerOptions);
        try {
            //console.log("process.env.WEBRTCSERVEROPTIONS:"+ process.env.WEBRTCSERVEROPTIONS);
            const webRtcServerOptions:any = JSON.parse(process.env.WEBRTCSERVEROPTIONS as string);
            const portIncrement = this.workers.length - 1;

            for (const listenInfo of webRtcServerOptions.listenInfos ) {
                listenInfo.port += portIncrement;
            }

            const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

            worker.appData.webRtcServer = webRtcServer;
          }catch(err) {
            console.log("create webrtc server get a error:",err);
          }
      }
    }
  }

  get(pid: number) {
    const worker = this.workers.find((worker) => worker.pid === pid);
    if (worker) {
      return worker;
    }
    throw new ServiceError(404, 'Worker not found');
  }
}

export const mediasoupWorkerManager = new MediasoupWorkerManager();
