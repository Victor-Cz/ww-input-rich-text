// English locale for SEO checks: title, description, objective (the target to
// reach, in plain words), and messages per status (good / warning / bad, plus
// na for some checks). Messages support {value} interpolation.
// The `categories` key holds the name / description of each check category.

export default {
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
        title: 'Subheading distribution',
        description: 'Checks that no section exceeds 300 words without a subheading.',
        objective: '≤ 300 words per section',
        messages: {
            good: 'The text is well divided by subheadings.',
            warning: 'A section is {value} words long without a subheading, add one.',
            bad: 'A section is {value} words long without a subheading: split it up.',
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
        title: 'Structured content',
        description: 'Checks for lists or tables, which help with featured snippets.',
        objective: '≥ 1 list or table',
        messages: {
            good: 'The content uses lists or tables.',
            warning: 'Add a list or a table (good for featured snippets).',
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
            warning: '{value} outbound link(s) for this amount of text: add more.',
            bad: 'Not enough outbound links ({value}): add links to external sources.',
        },
    },
    internalLinks: {
        title: 'Internal links',
        description: 'Checks the number of links to other pages of the site: about one per 500 words (minimum one).',
        objective: '≥ 1 internal link per ~500 words',
        messages: {
            good: 'The text contains {value} internal link(s), that is sufficient.',
            warning: '{value} internal link(s) for this amount of text: add more.',
            bad: 'Not enough internal links ({value}): add links to other pages of the site.',
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
        description: 'Checks the number of images against the text length: about one per 500 words (minimum one).',
        objective: '≥ 1 image per ~500 words',
        messages: {
            good: 'The content contains {value} image(s), that is sufficient.',
            warning: '{value} image(s) for this amount of text: add more.',
            bad: 'Only {value} image(s) for this amount of text: add more.',
            none: 'No images: add at least one media element.',
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
            na: 'The keyphrase only contains function words: choose a more specific keyphrase.',
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
            warning: 'The keyphrase words are in the H1 but scattered.',
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
            warning: 'The keyphrase words are in the introduction but scattered.',
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
            bad: 'The keyphrase does not appear in any subheading.',
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
            bad: 'Secondary keywords do not appear in subheadings.',
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
            warning: 'The keyphrase words are in the meta title but separated.',
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
            bad: 'The meta description is {value} characters: it will be truncated.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Keyphrase in meta description',
        description: 'Checks that the keyphrase appears 1 to 2 times in the meta description.',
        objective: '1-2 occurrences',
        messages: {
            good: 'The keyphrase appears {value} time(s) in the meta description.',
            bad: 'The keyphrase should appear 1-2 times in the meta description (currently {value}).',
        },
    },
};
