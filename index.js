const { scheduleJob } = require('./src/jobManager');
const { generateKbart, generateHoldings } = require('./src/tasks/index');

(async function main () {
  //const job = scheduleJob(generateKbart,
  //  [{ corpus: 'bmj' }],
  //  '*',
  //  'Generate allTitle KBART',
  //  { sendMailOnErrorTo: ['jean-joffrey.parentin@inist.fr'] },
  //);
  const job = scheduleJob(generateHoldings,
    [{ corpus: 'wiley', force: false }],
    '*',
    'Generate allTitle Holdings',
    { sendMailOnErrorTo: ['jean-joffrey.parentin@inist.fr'] },
  );

})()
  .catch((reason) => {
    console.error(reason);
    process.exit(1);
  });

