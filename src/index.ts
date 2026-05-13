#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import { logger } from "./utils/logger.js";

const program = new Command();

program
  .name("newspapper")
  .description("Personal news aggregation and slide generation tool")
  .version("2.0.0");

async function mainMenu() {
  console.clear();
  console.log("═".repeat(50));
  console.log("  NEWSPAPPER - Personal News Aggregator");
  console.log("═".repeat(50) + "\n");

  const choices = [
    { name: "Scrape articles   - Fetch today's news", value: "scrape" },
    {
      name: "Extract entities  - Identify people, places, and orgs",
      value: "extract",
    },
    { name: "Format post       - Create a post with AI help", value: "format" },
    {
      name: "Generate slides   - Render approved posts to images",
      value: "generate",
    },
    { name: "List items        - Browse articles and data", value: "list" },
    { name: "Clean data        - Purge old database records", value: "clean" },
    { name: "Exit              - Close the application", value: "exit" },
  ];

  while (true) {
    let action: string;
    try {
      const answers = await (inquirer.prompt as any)([
        {
          type: "list",
          name: "action",
          message: "Select an action:",
          choices,
          pageSize: 10,
        },
      ]);
      action = answers.action;
    } catch (error: any) {
      // Handle Ctrl+C (SIGINT) gracefully
      console.log("\n");
      logger.info("Goodbye!");
      process.exit(0);
    }

    if (action === "exit") {
      logger.info("Goodbye!");
      process.exit(0);
    }

    try {
      switch (action) {
        case "scrape": {
          const { scrapeCommand } = await import("./commands/scrape.js");
          await scrapeCommand({});
          break;
        }
        case "extract": {
          const { extractEntitiesCommand } =
            await import("./commands/extract-entities.js");
          await extractEntitiesCommand();
          break;
        }
        case "format": {
          const { entities } = await inquirer.prompt([
            {
              type: "input",
              name: "entities",
              message: "Enter entities to build post around (comma-separated):",
              validate: (input) =>
                input.trim().length > 0 || "Entities are required",
            },
          ]);
          const { formatCommand } = await import("./commands/format.js");
          await formatCommand({ entities });
          break;
        }
        case "generate": {
          const { db } = await import("./storage/database.js");
          db.initialize();
          const posts = db.getAllPosts();
          if (posts.length === 0) {
            logger.warn("No posts found. Format a post first.");
            break;
          }
          const { postPath } = await inquirer.prompt([
            {
              type: "list",
              name: "postPath",
              message: "Select a post to generate slides for:",
              choices: posts.map((p) => ({
                name: p.slug,
                value: p.slides_path.replace("/slides.json", ""),
              })),
            },
          ]);
          const { generateCommand } = await import("./commands/generate.js");
          await generateCommand(postPath);
          break;
        }
        case "list": {
          const { listCommand } = await import("./commands/list.js");
          await listCommand({ type: "articles" });
          break;
        }
        case "clean": {
          const { cleanCommand } = await import("./commands/clean.js");
          await cleanCommand({});
          break;
        }
      }
    } catch (error) {
      logger.error(`Error: ${(error as Error).message}`);
    }

    console.log("\n" + "─".repeat(50) + "\n");
  }
}

program.action(async () => {
  await mainMenu();
});

program.parse();
