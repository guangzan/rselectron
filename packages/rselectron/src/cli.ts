import { runCli } from '../../cli/src/index.ts';

export async function main(args = process.argv.slice(2)): Promise<number> {
  return runCli(args);
}

process.exitCode = await main();
