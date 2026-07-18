// English locale for SEO checks: title, description, and per-status messages
// (good / warning / bad, plus na for some checks).
// Messages support {value} / {value.x} interpolation.
// The `categories` key holds the name / description of each check category.

export default {
    categories: {
        structure: {
            name: 'Structure',
            description: 'Content structure: text length, heading hierarchy, paragraphs and formatting.',
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
            description: 'Presence and optimization of images and media (alt attributes, image / text ratio).',
        },
        keyword: {
            name: 'Focus keyphrase',
            description: 'Use of the focus keyphrase throughout the content.',
        },
        secondary: {
            name: 'Secondary keywords',
            description: 'Presence and distribution of the secondary keywords.',
        },
        metaTitle: {
            name: 'Meta title',
            description: 'Optimization of the page meta title (keyphrase, length, appeal).',
        },
        metaDescription: {
            name: 'Meta description',
            description: 'Optimization of the page meta description (keyphrase, length).',
        },
        slug: {
            name: 'Slug',
            description: 'Optimization of the page URL slug (keyphrase, length, cleanliness).',
        },
    },
    // Structure
    textLength: {
        title: 'Text length',
        description: 'Checks that the text is long enough to rank (at least 300 words recommended).',
        messages: {
            good: 'The text is {value} words long, that is sufficient.',
            warning: 'The text is {value} words long, aim for at least 300 words.',
            bad: 'The text is {value} words long, that is too short to rank well.',
        },
    },
    singleH1: {
        title: 'Single H1 heading',
        description: 'Checks that the content contains exactly one H1 heading.',
        messages: {
            good: 'The H1 structure is correct.',
            warning: 'The content has no H1 while one is expected.',
            bad: 'The content contains {value} H1 headings: there must be only one.',
        },
    },
    headingHierarchy: {
        title: 'Heading hierarchy',
        description: 'Checks that heading levels follow each other without skipping (e.g. no H2 → H4).',
        messages: {
            good: 'The heading hierarchy is consistent.',
            warning: '{value} heading(s) skip a level (e.g. H2 → H4).',
        },
    },
    subheadingDistribution: {
        title: 'Subheading distribution',
        description: 'Checks that no section exceeds 300 words without a subheading.',
        messages: {
            good: 'The text is well divided by subheadings.',
            warning: 'A section is {value} words long without a subheading, add one.',
            bad: 'A section is {value} words long without a subheading: split it up.',
        },
    },
    paragraphLength: {
        title: 'Paragraph length',
        description: 'Checks that no paragraph exceeds 150 words, to stay readable.',
        messages: {
            good: 'No paragraph is too long.',
            warning: '{value} paragraph(s) exceed 150 words.',
            bad: '{value} paragraph(s) exceed 200 words: shorten them.',
        },
    },
    structuredContent: {
        title: 'Structured content',
        description: 'Checks for lists or tables, which help win featured snippets.',
        messages: {
            good: 'The content uses lists or tables.',
            warning: 'Add a list or a table (good for featured snippets).',
        },
    },
    centeredContent: {
        title: 'Centered text',
        description: 'Checks that no long block of text is center-aligned, which hurts readability.',
        messages: {
            good: 'No long block of centered text.',
            bad: '{value} long text block(s) are center-aligned, which hurts readability.',
        },
    },
    // Readability
    sentenceLength: {
        title: 'Sentence length',
        description: 'Checks the share of sentences that are too long (more than 25 words).',
        messages: {
            good: 'Sentences have a good length ({value}% long sentences).',
            warning: '{value}% of sentences exceed 25 words: aim for 25% maximum.',
            bad: '{value}% of sentences exceed 25 words: shorten them.',
            na: 'Text too short to assess sentence length.',
        },
    },
    fleschReadingEase: {
        title: 'Flesch reading ease',
        description: 'Flesch reading-ease score (0-100, the higher the more readable).',
        messages: {
            good: 'Flesch score of {value}: the text is easy to read.',
            warning: 'Flesch score of {value}: the text is fairly difficult to read.',
            bad: 'Flesch score of {value}: the text is difficult to read, simplify it.',
            na: 'Text too short to compute the readability score.',
        },
    },
    transitionWords: {
        title: 'Transition words',
        description: 'Checks that enough sentences contain a transition word (therefore, however, for example…).',
        messages: {
            good: '{value}% of sentences contain a transition word.',
            warning: 'Only {value}% of sentences contain a transition word (aim for 30%).',
            bad: '{value}% of sentences contain a transition word: add more.',
            na: 'Text too short to assess transition words.',
        },
    },
    consecutiveSentences: {
        title: 'Repeated sentence beginnings',
        description: 'Checks that no 3 or more consecutive sentences start with the same word.',
        messages: {
            good: 'No repeated sentence beginnings.',
            bad: '{value} consecutive sentences start with the same word: vary your sentence beginnings.',
            na: 'Text too short to assess sentence beginnings.',
        },
    },
    passiveVoice: {
        title: 'Passive voice',
        description: 'Checks the share of sentences using the passive voice (10% maximum recommended).',
        messages: {
            good: '{value}% of sentences use the passive voice, that is fine.',
            warning: '{value}% of sentences use the passive voice: aim for 10% maximum.',
            bad: '{value}% of sentences use the passive voice: prefer the active voice.',
            na: 'Text too short to assess passive voice.',
        },
    },
    complexWords: {
        title: 'Complex words',
        description: 'Checks the share of long or complex words (10% maximum recommended).',
        messages: {
            good: '{value}% complex words: the vocabulary stays accessible.',
            warning: '{value}% complex words: simplify the vocabulary.',
            bad: '{value}% complex words: the text is difficult, simplify it.',
            na: 'Text too short to assess vocabulary complexity.',
        },
    },
    // Links
    outboundLinks: {
        title: 'Outbound links',
        description: 'Checks for links to external sources that search engines can follow.',
        messages: {
            good: 'The text contains {value} outbound link(s).',
            warning: 'All outbound links are nofollowed.',
            bad: 'No outbound links: add links to external sources.',
        },
    },
    internalLinks: {
        title: 'Internal links',
        description: 'Checks for links to other pages of the site (internal linking).',
        messages: {
            good: 'The text contains {value} internal link(s).',
            warning: 'All internal links are nofollowed.',
            bad: 'No internal links: add links to other pages of the site.',
        },
    },
    genericAnchors: {
        title: 'Descriptive anchors',
        description: 'Checks that links do not use generic anchors like “click here”.',
        messages: {
            good: 'Link anchors are descriptive.',
            warning: '{value} link(s) use a generic anchor (“click here”…).',
        },
    },
    emptyLinks: {
        title: 'Empty links',
        description: 'Checks that no link is empty or points to “#”.',
        messages: {
            good: 'No empty or broken links.',
            bad: '{value} link(s) are empty or point to “#”.',
        },
    },
    // Images
    imagePresence: {
        title: 'Image presence',
        description: 'Checks that the content contains at least one image or media element.',
        messages: {
            good: 'The content contains {value} image(s).',
            warning: 'Add more images: only {value} for a long text.',
            bad: 'No images: add at least one media element.',
        },
    },
    imageAlt: {
        title: 'Image alt attributes',
        description: 'Checks that every image has an alt attribute (accessibility and SEO).',
        messages: {
            good: 'All images have an alt attribute.',
            warning: '{value} image(s) are missing an alt attribute.',
            bad: 'No image has an alt attribute.',
        },
    },
    imageRatio: {
        title: 'Image / text ratio',
        description: 'Checks the number of images relative to the text length (about one per 500 words).',
        messages: {
            good: 'The image / text ratio is good.',
            warning: 'Add images: about one per 500 words is recommended.',
        },
    },
    // Focus keyphrase
    keyphraseLength: {
        title: 'Keyphrase length',
        description: 'Checks that the focus keyphrase contains 1 to 4 content words.',
        messages: {
            good: 'The keyphrase length is good ({value} content words).',
            warning: 'The keyphrase is long ({value} words): aim for 1 to 4 content words.',
            bad: 'The keyphrase is too long ({value} words).',
            na: 'The keyphrase only contains function words: choose a more specific keyphrase.',
        },
    },
    keywordInIntroduction: {
        title: 'Keyphrase in introduction',
        description: 'Checks that the focus keyphrase appears in the first paragraph.',
        messages: {
            good: 'The keyphrase appears in the introduction.',
            warning: 'The keyphrase words are in the introduction but scattered.',
            bad: 'The keyphrase does not appear in the introduction.',
        },
    },
    keywordDensity: {
        title: 'Keyphrase density',
        description: 'Checks that the keyphrase appears often enough, without over-optimization (keyword stuffing).',
        messages: {
            good: 'The keyphrase density is good ({value.occurrences} occurrence(s)).',
            warning: 'The keyphrase density could be better ({value.occurrences} occurrence(s)).',
            bad: 'Bad keyphrase density: missing, or over-optimized (keyword stuffing).',
        },
    },
    keywordInSubheadings: {
        title: 'Keyphrase in subheadings',
        description: 'Checks that the keyphrase appears in 30 to 75% of subheadings.',
        messages: {
            good: 'The keyphrase appears in {value}% of subheadings.',
            warning: 'The keyphrase appears in {value}% of subheadings (aim for 30-75%).',
            bad: 'The keyphrase does not appear in any subheading.',
        },
    },
    keywordDistribution: {
        title: 'Keyphrase distribution',
        description: 'Checks that the keyphrase is spread throughout the text, not concentrated in one spot.',
        messages: {
            good: 'The keyphrase is evenly distributed throughout the text.',
            warning: 'The keyphrase is unevenly distributed.',
            bad: 'The keyphrase is concentrated in one part of the text.',
        },
    },
    keywordInImageAlt: {
        title: 'Keyphrase in image alt',
        description: 'Checks that the keyphrase appears in the alt attribute of at least one image.',
        messages: {
            good: 'The keyphrase appears in the alt attribute of {value} image(s).',
            warning: 'The keyphrase does not appear in any image alt attribute.',
            bad: 'Images have no alt attribute to optimize.',
        },
    },
    competingAnchor: {
        title: 'Competing anchor',
        description: 'Checks that no outbound link uses the keyphrase as anchor text (cannibalization risk).',
        messages: {
            good: 'No link uses the keyphrase as anchor text.',
            bad: '{value} link(s) use the keyphrase as anchor text (cannibalization).',
        },
    },
    // Secondary keywords
    secondaryPresence: {
        title: 'Secondary keywords presence',
        description: 'Checks that the secondary keywords appear in the text.',
        messages: {
            good: '{value.found}/{value.total} secondary keywords are present.',
            warning: 'Only {value.found}/{value.total} secondary keywords present.',
            bad: 'Almost no secondary keywords present ({value.found}/{value.total}).',
        },
    },
    secondaryInSubheadings: {
        title: 'Secondary keywords in subheadings',
        description: 'Checks that secondary keywords appear in subheadings.',
        messages: {
            good: '{value.covered}/{value.total} secondary keywords appear in a subheading.',
            warning: 'Few secondary keywords in subheadings ({value.covered}/{value.total}).',
            bad: 'Secondary keywords do not appear in subheadings.',
        },
    },
    secondaryDensity: {
        title: 'Secondary keywords density',
        description: 'Checks that no secondary keyword exceeds 2.5% density (over-optimization).',
        messages: {
            good: 'No secondary keyword is overused.',
            bad: 'Over-optimization: {value} exceed 2.5% density.',
        },
    },
    // Meta title
    metaTitleKeyword: {
        title: 'Keyphrase in meta title',
        description: 'Checks that the focus keyphrase is present in the meta title.',
        messages: {
            good: 'The keyphrase is present in the meta title.',
            warning: 'The keyphrase words are in the meta title but separated.',
            bad: 'The keyphrase is missing from the meta title.',
        },
    },
    metaTitleKeywordPosition: {
        title: 'Keyphrase position in meta title',
        description: 'Checks that the keyphrase is placed at the beginning of the meta title.',
        messages: {
            good: 'The keyphrase is at the beginning of the meta title.',
            warning: 'Place the keyphrase in the first half of the meta title.',
        },
    },
    metaTitleLength: {
        title: 'Meta title length',
        description: 'Checks that the meta title is 40 to 60 characters long so it is not truncated in SERPs.',
        messages: {
            good: 'The meta title is {value} characters long, that is good.',
            warning: 'The meta title is {value} characters: aim for 40-60.',
            bad: 'The meta title is {value} characters: it will be truncated in SERPs.',
        },
    },
    metaTitleAttractiveness: {
        title: 'Meta title appeal',
        description: 'Checks that the meta title contains a number, power word or sentiment word.',
        messages: {
            good: 'The meta title is attractive (number, power word or sentiment word).',
            warning: 'Strengthen the meta title: add a number, power word or sentiment word.',
            bad: 'The meta title lacks appeal (no number, power word or sentiment word).',
        },
    },
    // Meta description
    metaDescriptionLength: {
        title: 'Meta description length',
        description: 'Checks that the meta description is 121 to 156 characters long so it is not truncated.',
        messages: {
            good: 'The meta description is {value} characters long, that is good.',
            warning: 'The meta description is {value} characters: aim for 121-156.',
            bad: 'The meta description is {value} characters: it will be truncated.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Keyphrase in meta description',
        description: 'Checks that the keyphrase appears 1 to 2 times in the meta description.',
        messages: {
            good: 'The keyphrase appears {value} time(s) in the meta description.',
            bad: 'The keyphrase should appear 1-2 times in the meta description (currently {value}).',
        },
    },
    // Slug
    slugKeyword: {
        title: 'Keyphrase in slug',
        description: 'Checks that the focus keyphrase is present in the page slug.',
        messages: {
            good: 'The keyphrase is present in the slug.',
            warning: 'The slug only contains part of the keyphrase.',
            bad: 'The keyphrase is missing from the slug.',
        },
    },
    slugLength: {
        title: 'Slug length',
        description: 'Checks that the slug does not exceed 75 characters.',
        messages: {
            good: 'The slug is {value} characters long, that is good.',
            warning: 'The slug is {value} characters: aim for 75 max.',
        },
    },
    slugClean: {
        title: 'Slug cleanliness',
        description: 'Checks that the slug is lowercase, hyphenated, without accents or stop words.',
        messages: {
            good: 'The slug is clean (lowercase, hyphens, no stop words).',
            warning: 'Clean up the slug: lowercase, hyphens, no accents or stop words.',
        },
    },
};
