import PQueue from "p-queue";

const globalForQueue = globalThis as unknown as {
  __pk_jobQueue?: PQueue;
};

export const jobQueue =
  globalForQueue.__pk_jobQueue ?? new PQueue({ concurrency: 1 });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.__pk_jobQueue = jobQueue;
}
