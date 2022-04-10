import "@logseq/libs";

const settingsTemplate = [
  {
    key: "randomMode",
    type: "enum",
    default: "page",
    title: "Random Mode",
    description: "Page, tags or advanced query",
    enumChoices: ["page", "tags", "query"],
    enumPicker: "radio",
  },
  {
    key: "includeJournals",
    type: "boolean",
    default: false,
    title: "Page mode",
    description: "Include Journals?",
  },
  {
    key: "randomTags",
    type: "string",
    default: "",
    title: "Tags mode",
    description: "Comma separated the tags. e.g. programing,design,sports",
  },
  {
    key: "advancedQuery",
    type: "string",
    default: "",
    title: "Query mode",
    description:
      'Your custom query. e.g. [:find (pull ?b [*]) :where [?b :block/refs ?bp] [?bp :block/name "book"]]',
  },
];

logseq.useSettingsSchema(settingsTemplate);

async function openRandomNote() {
  const queryScript = getQueryScript();
  try {
    let ret = await logseq.DB.datascriptQuery(queryScript);
    const pages = ret?.flat();
    if (pages && pages.length > 0) {
      const index = Math.floor(Math.random() * pages.length);
      const page = pages[index];
      if (page && page.name) {
        logseq.App.pushState("page", { name: page.name });
      } else if (page && page.page) {
        const blockInfo = (await logseq.Editor.getBlock(page.id)) || {
          uuid: "",
        };
        logseq.App.pushState("page", { name: blockInfo.uuid });
      }
    }
  } catch (err) {
    logseq.App.showMsg(
      err.message || "Maybe something wrong with the query",
      "error"
    );
    console.log(err);
  }
}

function getQueryScript() {
  const randomMode = logseq.settings.randomMode;
  const includeJournals = logseq.settings.includeJournals;
  const randomTags = logseq.settings.randomTags.split(",");
  const defaultQuery = `
  [:find (pull ?p [*])
    :where
    [_ :block/page ?p]]`;
  switch (randomMode) {
    case "page":
      if (includeJournals) {
        return `
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]]`;
      } else {
        return `
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]
          [?p :block/journal? false]]`;
      }
    case "tags":
      const tags = randomTags.map((item) => '"' + item + '"').join(",");
      if (!logseq.settings.randomTags) {
        logseq.App.showMsg("Random tags are required.", "warning");
      }
      return (
        `
      [:find (pull ?b [*])
        :where
        [?b :block/refs ?bp] 
        [?bp :block/name ?name]
        [(contains? #{` +
        tags +
        `} ?name)]]
      `
      );
    case "query":
      return logseq.settings.advancedQuery;
    default:
      console.log("unknown");
      return defaultQuery;
  }
}

function main() {
  logseq.provideModel({
    handleRandomNote() {
      openRandomNote();
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "logseq-random-note-toolbar",
    template: `
      <span class="logseq-random-note-toolbar">
        <a title="I'm Feeling Lucky" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-windmill"></i>
        </a>
      </span>
    `,
  });
}

logseq.ready(main).catch(console.error);
