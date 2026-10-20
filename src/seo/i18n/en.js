// English locale for SEO checks: title, description, objective (the target to
// reach, in plain words), and messages per status (good / warning / bad, plus
// na for some checks). Messages support {value} interpolation.
// The `categories` key holds the name / description of each check category.

export default {
    // Default message for a non-applicable check without a dedicated `na` message
    // (missing input — keyword/meta not provided — or text too short).
    defaultNa: 'Not evaluated: missing input or text too short.',
    categories: {
        structure: {
            name: 'Structure',
            description: 'Content structure: text length, paragraphs and formatting.',
        },
        headings: {
            name: 'Headings',
            description: 'Heading content (H1-H6): length and keyword presence (heading structure lives in the Structure category).',
        },
        readability: {
            name: 'Readability',
            description: 'How easy the text is to read: sentence length, vocabulary, style.',
        },
        links: {
            name: 'Links',
            description: 'Internal and outbound links, and the quality of their anchors.',
        },
        images: {
            name: 'Images',
            description: 'Presence and optimization of images and media (alt attributes).',
        },
        keyword: {
            name: 'Keywords',
            description: 'Use of the focus keyword and secondary keywords throughout the content.',
        },
        meta: {
            name: 'Metas',
            description: 'Optimization of the page meta title and meta description.',
        },
        credibility: {
            name: 'Credibility',
            description: 'Sourced figures, quotes, data freshness: what makes a passage worth citing.',
        },
    },
    // Structure
    textLength: {
        title: 'Text length',
        description: 'Checks that the text is long enough to rank (300 words minimum recommended).',
        objective: '≥ 300 words',
        messages: {
            good: 'The text is {value} words long, that is sufficient.',
            warning: 'The text is {value} words long, aim for at least 300 words.',
            bad: 'The text is {value} words long, that is too short to rank well.',
        },
    },
    headingHierarchy: {
        title: 'Heading structure',
        description: 'Checks there is exactly one H1 and that heading levels follow each other without skips (e.g. no H2 → H4).',
        objective: 'One H1, no skipped levels',
        messages: {
            good: 'The heading structure is consistent.',
            warning: '{value} heading(s) skip a level (e.g. H2 → H4).',
            multipleH1: 'The content contains {value} H1 headings: there must be only one.',
            missingH1: 'The content has no H1 while one is expected: add an H1 heading.',
        },
    },
    subheadingDistribution: {
        title: 'Section length',
        description: 'Checks that each section (text between two subheadings) is 80 to 300 words long: enough to stand alone, short enough to stay focused.',
        objective: '80-300 words per section',
        messages: {
            good: 'Sections have a good length.',
            warning: '{value} section(s) fall outside the 80-300 word range.',
            bad: '{value} section(s) fall outside the 80-300 word range: rework the structure.',
            tooLong: '{value} section(s) out of range, including at least one over 300 words without a subheading: split it up.',
            tooShort: '{value} section(s) are under 80 words: expand or merge them.',
        },
    },
    paragraphLength: {
        title: 'Paragraph length',
        description: 'Checks that no paragraph exceeds 150 words, to stay readable.',
        objective: '≤ 150 words per paragraph',
        messages: {
            good: 'No paragraph is too long.',
            warning: '{value} paragraph(s) exceed 150 words.',
            bad: '{value} paragraph(s) exceed 150 words: shorten them.',
        },
    },
    structuredContent: {
        title: 'Matching format',
        description: 'Checks that the format fits the content: numbered list for a procedure, table for a comparison, otherwise at least one list or table. Helps featured snippets and extraction by AI engines.',
        objective: 'Numbered list (procedure), table (comparison), otherwise ≥ 1 list or table',
        messages: {
            good: 'The format fits the content.',
            warning: 'Add a list or a table (good for featured snippets).',
            missingOrderedList: 'The content describes a procedure: present the steps as a numbered list.',
            missingTable: 'The content compares options: add a comparison table.',
        },
    },
    centeredContent: {
        title: 'Centered text',
        description: 'Checks that no long block of text is center-aligned, which hurts readability.',
        objective: 'No long centered block',
        messages: {
            good: 'No long block of centered text.',
            bad: '{value} long text block(s) are center-aligned, which hurts readability.',
        },
    },
    // Readability
    sentenceLength: {
        title: 'Sentence length',
        description: 'Checks the share of overly long sentences (more than 25 words).',
        objective: '≤ 25% long sentences',
        messages: {
            good: 'Sentences have a good length ({value}% long sentences).',
            warning: '{value}% of sentences exceed 25 words: aim for 25% maximum.',
            bad: '{value}% of sentences exceed 25 words: shorten them.',
            na: 'Text too short to evaluate sentence length.',
        },
    },
    transitionWords: {
        title: 'Transition words',
        description: 'Checks that enough sentences contain a transition word (therefore, next, for example…).',
        objective: '≥ 30% of sentences',
        messages: {
            good: '{value}% of sentences contain a transition word.',
            warning: 'Only {value}% of sentences contain a transition word (aim for 30%).',
            bad: '{value}% of sentences contain a transition word: add more.',
            na: 'Text too short to evaluate transition words.',
        },
    },
    consecutiveSentences: {
        title: 'Repeated sentence beginnings',
        description: 'Checks that no 3 or more consecutive sentences start with the same word.',
        objective: '< 3 identical beginnings in a row',
        messages: {
            good: 'No repeated sentence beginnings.',
            bad: '{value} consecutive sentences start with the same word: vary your sentence beginnings.',
            na: 'Text too short to evaluate sentence beginnings.',
        },
    },
    passiveVoice: {
        title: 'Passive voice',
        description: 'Checks the share of sentences in the passive voice (10% maximum recommended).',
        objective: '≤ 10% passive sentences',
        messages: {
            good: '{value}% of sentences use the passive voice, that is fine.',
            warning: '{value}% of sentences use the passive voice: aim for 10% maximum.',
            bad: '{value}% of sentences use the passive voice: prefer the active voice.',
            na: 'Text too short to evaluate passive voice.',
        },
    },
    complexWords: {
        title: 'Complex words',
        description: 'Checks the share of long or complex words (10% maximum recommended).',
        objective: '≤ 10% complex words',
        messages: {
            good: '{value}% complex words: the vocabulary stays accessible.',
            warning: '{value}% complex words: simplify the vocabulary.',
            bad: '{value}% complex words: the text is difficult, simplify it.',
            na: 'Text too short to evaluate vocabulary complexity.',
        },
    },
    // Links
    outboundLinks: {
        title: 'Outbound links',
        description: 'Checks the number of links to external sources: about one per 1000 words (minimum one).',
        objective: '≥ 1 external link per ~1000 words',
        messages: {
            good: 'The text contains {value} outbound link(s), that is sufficient.',
            warning: '{value} outbound link(s) for this amount of text: aim for {target}.',
            bad: 'Only {value} outbound link(s): aim for {target} to external sources.',
            none: 'No outbound links: aim for {target} to external sources.',
        },
    },
    internalLinks: {
        title: 'Internal links',
        description: 'Checks the number of links to other pages of the site: about one per 1000 words (minimum one).',
        objective: '≥ 1 internal link per ~1000 words',
        messages: {
            good: 'The text contains {value} internal link(s), that is sufficient.',
            warning: '{value} internal link(s) for this amount of text: aim for {target}.',
            bad: 'Only {value} internal link(s): aim for {target} to other pages of the site.',
            none: 'No internal links: aim for {target} to other pages of the site.',
        },
    },
    genericAnchors: {
        title: 'Descriptive anchors',
        description: 'Checks that links do not use generic anchors like “click here”.',
        objective: 'No generic anchors',
        messages: {
            good: 'Link anchors are descriptive.',
            warning: '{value} link(s) use a generic anchor (“click here”…).',
        },
    },
    emptyLinks: {
        title: 'Empty links',
        description: 'Checks that no link is empty or points to “#”.',
        objective: 'No empty links',
        messages: {
            good: 'No empty or broken links.',
            bad: '{value} link(s) are empty or point to “#”.',
        },
    },
    // Images
    imagePresence: {
        title: 'Image count',
        description: 'Checks the number of images against the text length: about one per 750 words (minimum one).',
        objective: '≥ 1 image per ~750 words',
        messages: {
            good: 'The content contains {value} image(s), that is sufficient.',
            warning: '{value} image(s) for this amount of text: aim for {target}.',
            bad: 'Only {value} image(s) for this amount of text: aim for {target}.',
            none: 'No images: aim for {target} for this amount of text.',
        },
    },
    imageAlt: {
        title: 'Image alt attributes',
        description: 'Checks that every image has an alt attribute (accessibility and SEO).',
        objective: 'An alt on every image',
        messages: {
            good: 'All images have an alt attribute.',
            warning: '{value} image(s) are missing an alt attribute.',
            bad: '{value} image(s) are missing an alt attribute: fill them in.',
        },
    },
    // Focus keyword
    keyphraseLength: {
        title: 'Keyphrase length',
        description: 'Checks that the focus keyword contains 1 to 4 content words.',
        objective: '1-4 content words',
        messages: {
            good: 'The keyphrase length is good ({value} content words).',
            warning: 'The keyphrase is long ({value} words): aim for 1 to 4 content words.',
            bad: 'The keyphrase is too long ({value} words).',
            onlyStopwords: 'The keyphrase only contains function words: choose a more specific keyphrase.',
        },
    },
    headingLength: {
        title: 'Heading length',
        description: 'Checks that headings stay concise (60 characters maximum recommended).',
        objective: '≤ 60 characters per heading',
        messages: {
            good: 'Headings have a good length.',
            warning: '{value} heading(s) are a bit long (> 60 characters).',
            bad: '{value} heading(s) are too long: shorten them.',
            na: 'No headings in the content.',
        },
    },
    keywordInH1: {
        title: 'Keyphrase in H1 heading',
        description: 'Checks that the focus keyword appears in the content H1 heading.',
        objective: 'Keyphrase in the H1',
        messages: {
            good: 'The keyphrase appears in the H1 heading.',
            warning: 'The keyphrase does not fully appear in the H1 (missing or separated words).',
            bad: 'The keyphrase does not appear in the H1 heading.',
            na: 'No H1 heading in the content.',
        },
    },
    keywordInIntroduction: {
        title: 'Keyphrase in introduction',
        description: 'Checks that the focus keyword appears in the first paragraph.',
        objective: 'Keyphrase in the 1st paragraph',
        messages: {
            good: 'The keyphrase appears in the introduction.',
            warning: 'The keyphrase does not fully appear in the introduction (missing or separated words).',
            bad: 'The keyphrase does not appear in the introduction.',
        },
    },
    keywordDensity: {
        title: 'Keyphrase density',
        description: 'Checks that the keyphrase is present enough, without over-optimization (keyword stuffing).',
        objective: 'Density between 0.5 and 3%',
        messages: {
            good: 'The keyphrase density is good ({value}%).',
            warning: 'The keyphrase density could be better ({value}%): aim for 0.5 to 3%.',
            bad: 'Bad keyphrase density ({value}%): missing, or over-optimized (keyword stuffing).',
        },
    },
    keywordInSubheadings: {
        title: 'Keyphrase in subheadings',
        description: 'Checks that the keyphrase appears in 30 to 75% of subheadings.',
        objective: 'In 30-75% of subheadings',
        messages: {
            good: 'The keyphrase appears in {value}% of subheadings.',
            warning: 'The keyphrase appears in {value}% of subheadings (aim for 30-75%).',
            bad: 'The keyphrase appears in only {value}% of subheadings (aim for 30-75%).',
            none: 'The keyphrase does not appear in any subheading.',
        },
    },
    keywordDistribution: {
        title: 'Keyphrase distribution',
        description: 'Checks that the keyphrase is spread across the whole text, not concentrated in one place.',
        objective: 'Present in ≥ 3 quarters of the text',
        messages: {
            good: 'The keyphrase is evenly distributed throughout the text.',
            warning: 'The keyphrase is unevenly distributed.',
            bad: 'The keyphrase is concentrated in one part of the text.',
        },
    },
    keywordInImageAlt: {
        title: 'Keyphrase in image alts',
        description: 'Checks that the keyphrase appears in the alt attribute of at least one image.',
        objective: 'In ≥ 1 alt attribute',
        messages: {
            good: 'The keyphrase appears in the alt attribute of {value} image(s).',
            warning: 'The keyphrase does not appear in any image alt attribute.',
            bad: 'Images have no alt attribute to optimize.',
        },
    },
    competingAnchor: {
        title: 'Competing anchor',
        description: 'Checks that no link uses the keyphrase as anchor text (cannibalization risk).',
        objective: 'No anchor = keyphrase',
        messages: {
            good: 'No link uses the keyphrase as anchor text.',
            bad: '{value} link(s) use the keyphrase as anchor text (cannibalization).',
        },
    },
    secondaryKeywords: {
        title: 'Secondary keywords',
        description: 'Checks that secondary keywords appear in the text.',
        objective: '≥ 70% of secondary keywords present',
        messages: {
            good: '{value}% of secondary keywords are present.',
            warning: 'Only {value}% of secondary keywords are present (aim for 70%).',
            bad: 'Almost no secondary keywords present ({value}%).',
        },
    },
    // Headings category
    secondaryInSubheadings: {
        title: 'Secondary keywords in subheadings',
        description: 'Checks that secondary keywords appear in subheadings.',
        objective: '≥ 50% of secondary keywords in a subheading',
        messages: {
            good: '{value}% of secondary keywords appear in a subheading.',
            warning: 'Few secondary keywords in subheadings ({value}%).',
            bad: 'Too few secondary keywords in subheadings ({value}%): aim for 50%.',
            none: 'Secondary keywords do not appear in any subheading.',
        },
    },
    // Metas
    metaTitleKeyword: {
        title: 'Keyphrase in meta title',
        description: 'Checks that the focus keyword is present at the beginning of the meta title.',
        objective: 'Keyphrase at the start of the title',
        messages: {
            good: 'The keyphrase is present at the beginning of the meta title.',
            late: 'The keyphrase is in the meta title: place it in the first half.',
            warning: 'The keyphrase does not fully appear in the meta title (missing or separated words).',
            bad: 'The keyphrase is missing from the meta title.',
        },
    },
    metaTitleLength: {
        title: 'Meta title length',
        description: 'Checks that the meta title is 40 to 60 characters so it is not truncated in SERPs.',
        objective: '40-60 characters',
        messages: {
            good: 'The meta title is {value} characters long, that is good.',
            warning: 'The meta title is {value} characters: aim for 40-60.',
            tooShort: 'The meta title is {value} characters: it is too short, aim for at least 40.',
            tooLong: 'The meta title is {value} characters: it is too long, aim for 60 max.',
            bad: 'The meta title is {value} characters: it will be truncated in SERPs.',
        },
    },
    metaTitleAttractiveness: {
        title: 'Meta title appeal',
        description: 'Checks that the meta title contains a number, a power word or a sentiment word.',
        objective: '≥ 2 signals out of 3 (number, power word, sentiment)',
        messages: {
            good: 'The meta title is attractive ({value} signal(s) out of 3).',
            warning: 'Strengthen the meta title: add a number, power word or sentiment word.',
            bad: 'The meta title lacks appeal (no number, power word or sentiment word).',
        },
    },
    metaDescriptionLength: {
        title: 'Meta description length',
        description: 'Checks that the meta description is 121 to 156 characters so it is not truncated.',
        objective: '121-156 characters',
        messages: {
            good: 'The meta description is {value} characters long, that is good.',
            warning: 'The meta description is {value} characters: aim for 121-156.',
            tooShort: 'The meta description is {value} characters: it is too short, aim for at least 121.',
            tooLong: 'The meta description is {value} characters: it is too long, aim for 156 max.',
            bad: 'The meta description is {value} characters: it will be truncated.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Keyphrase in meta description',
        description: 'Checks that the keyphrase appears 1 to 2 times in the meta description.',
        objective: '1-2 occurrences',
        messages: {
            good: 'The keyphrase appears {value} time(s) in the meta description.',
            warning: 'The keyphrase appears {value} times in the meta description: 1-2 is ideal.',
            bad: 'The keyphrase should appear 1-2 times in the meta description (currently {value}).',
        },
    },
    // GEO — structure
    answerFirst: {
        title: 'Answer first',
        description: 'Checks that each section opens with a direct answer: a 30 to 80 word paragraph, or a list / table.',
        objective: '30-80 word first paragraph after each subheading',
        messages: {
            good: 'Sections open with a direct answer.',
            warning: '{value} section(s) do not open with a direct 30-80 word answer.',
            bad: '{value} section(s) do not open with a direct answer: lead with the answer, then elaborate.',
            na: 'Not enough sections to evaluate.',
        },
    },
    selfContained: {
        title: 'Self-contained passages',
        description: 'Checks that each section makes sense on its own, without pointing back to earlier text ("This…", "as mentioned above").',
        objective: 'No context-dependent section',
        messages: {
            good: 'Sections make sense on their own.',
            warning: '{value} reference(s) to context: name the subject instead of pointing to it.',
            bad: '{value} reference(s) to context: extracted alone, these sections lose their meaning.',
            na: 'No section to evaluate.',
        },
    },
    keyTakeaways: {
        title: 'Summary up front',
        description: 'Checks that the content opens with a summary: a "Key takeaways / TL;DR" block, or a short intro containing the keyword.',
        objective: 'Takeaways block or intro ≤ 100 words with the keyword',
        messages: {
            good: 'The content opens with a summary.',
            warning: 'The intro is {value} words long: shorten it or add a "Key takeaways" block.',
            bad: 'The intro is {value} words long: add a "Key takeaways" block up front.',
            missingKeyword: 'The intro is short but does not mention the keyword.',
            noIntro: 'The content starts with a subheading: add a short intro.',
        },
    },
    // GEO — headings
    questionHeadings: {
        title: 'Question headings',
        description: 'Checks that some subheadings mirror search queries ("How…?", "What…?").',
        objective: '≥ 30% of H2/H3 as questions',
        messages: {
            good: '{value}% of subheadings are questions.',
            warning: '{value}% of subheadings are questions: aim for 30%.',
            bad: '{value}% of subheadings are questions: rephrase a few as queries.',
            na: 'Not enough subheadings to evaluate.',
        },
    },
    descriptiveHeadings: {
        title: 'Descriptive headings',
        description: 'Checks that each subheading names its subject (no bare "Introduction" or "Pros").',
        objective: 'No generic subheading',
        messages: {
            good: 'Subheadings are descriptive.',
            warning: '{value} generic subheading(s): say what they are about.',
            bad: '{value} generic subheading(s): a heading should name its subject.',
            na: 'No subheading to evaluate.',
        },
    },
    // GEO — readability
    vagueLanguage: {
        title: 'Vague language',
        description: 'Checks for claims without an identifiable subject ("some experts", "studies show").',
        objective: '≤ 5% of sentences',
        messages: {
            good: 'Claims are precise.',
            warning: '{value}% of sentences contain vague language: name the source.',
            bad: '{value}% of sentences contain vague language: replace it with attributed facts.',
            na: 'Text too short to evaluate.',
        },
    },
    acronymsDefined: {
        title: 'Acronyms spelled out',
        description: 'Checks that each acronym is spelled out on first use (well-known ones excepted).',
        objective: 'All acronyms spelled out',
        messages: {
            good: 'Acronyms are spelled out.',
            warning: '{value} acronym(s) are not spelled out on first use.',
            bad: '{value} acronym(s) are not spelled out: add the full form in parentheses.',
            na: 'No acronym to spell out.',
        },
    },
    // GEO — keyword
    definition: {
        title: 'Topic definition',
        description: 'Checks that the topic is defined early on ("X is…", "X refers to…").',
        objective: 'A definition in the first 150 words',
        messages: {
            good: 'The topic is defined early on.',
            keywordOnly: 'The keyword appears early, but without a definition: write "<keyword> is…".',
            bad: 'Define the topic in the first 150 words ("<keyword> is…").',
        },
    },
    entityPerSection: {
        title: 'Topic named in each part',
        description: 'Checks that each part (H2) names the topic, so it still makes sense once extracted.',
        objective: '≥ 80% of parts name the topic',
        messages: {
            good: '{value}% of parts name the topic.',
            warning: '{value}% of parts name the topic: name it in the others.',
            bad: '{value}% of parts name the topic: extracted alone, the others do not say what they are about.',
            na: 'Not enough parts (H2) to evaluate.',
        },
    },
    questionCoverage: {
        title: 'Questions covered',
        description: 'Checks that the content answers the target questions provided.',
        objective: '100% of target questions covered',
        messages: {
            good: '{value}% of target questions are covered.',
            warning: '{value}% of target questions are covered: address the others.',
            bad: '{value}% of target questions are covered: add sections that answer them.',
            na: 'No target question provided.',
        },
    },
    // GEO — credibility
    sourcedFacts: {
        title: 'Sourced facts',
        description: 'Checks that every figure is attributed to a source (external link or "according to…"). An unsourced figure costs more than no figure.',
        objective: 'All figures sourced',
        messages: {
            good: 'Figures are sourced.',
            warning: '{value} sentence(s) with figures and no source.',
            bad: '{value} sentence(s) with figures and no source: cite the source or drop the figure.',
            na: 'No figure to source.',
        },
    },
    factDensity: {
        title: 'Figures',
        description: 'Checks for precise, quantified facts (percentages, amounts, durations).',
        objective: '≈ 1 figure per 150 words',
        messages: {
            good: '{value} figure(s): that is enough.',
            warning: '{value} figure(s) out of {target} expected.',
            bad: '{value} figure(s) out of {target} expected: add sourced data.',
        },
    },
    quotations: {
        title: 'Quotes',
        description: 'Checks for at least one attributed quote (blockquote, or quoted words with their source).',
        objective: '≥ 1 attributed quote',
        messages: {
            good: 'The content quotes {value} source(s).',
            bad: 'Add an attributed expert quote.',
        },
    },
    freshness: {
        title: 'Data freshness',
        description: 'Checks that at least half of the years cited are recent (≤ 2 years old).',
        objective: '≥ 50% recent years',
        messages: {
            good: 'The data cited is recent.',
            warning: 'Only {value}% of the years cited are recent: update the data.',
            bad: 'Only {value}% of the years cited are recent: the data looks dated.',
            na: 'No year cited, or evergreen content.',
        },
    },
    entityDensity: {
        title: 'Named entities',
        description: 'Checks for proper nouns (brands, organizations, places, people) that anchor the content.',
        objective: '≥ 1 entity per 100 words',
        messages: {
            good: 'The content names specific entities.',
            warning: '{value} entity(ies) per 100 words: name specific players.',
            bad: '{value} entity(ies) per 100 words: the content stays generic.',
        },
    },
};
