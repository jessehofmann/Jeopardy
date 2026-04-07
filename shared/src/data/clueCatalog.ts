import type { Category } from "../types";

type RoundNumber = 1 | 2;
type Round1Value = 200 | 400 | 600 | 800 | 1000;
type Round2Value = 400 | 800 | 1200 | 1600 | 2000;
type TierValue = Round1Value | Round2Value;

interface ClueTemplate {
  question: string;
  answer: string;
}

interface CategoryBank<V extends TierValue> {
  id: string;
  name: string;
  cluesByValue: Record<V, ClueTemplate[]>;
}

interface GenerateRoundCatalogOptions {
  seed?: string;
  categoryCount?: number;
  excludeClueIds?: Iterable<string>;
}

interface GenerateGameCatalogsOptions {
  seed?: string;
  categoryCount?: number;
  round1ExcludeClueIds?: Iterable<string>;
  round2ExcludeClueIds?: Iterable<string>;
}

const ROUND_1_VALUES: Round1Value[] = [200, 400, 600, 800, 1000];
const ROUND_2_VALUES: Round2Value[] = [400, 800, 1200, 1600, 2000];
const DEFAULT_CATEGORY_COUNT = 5;

const round1Bank: Array<CategoryBank<Round1Value>> = [
  {
    id: "science",
    name: "Science",
    cluesByValue: {
      200: [
        { question: "The chemical formula H2O belongs to this compound, essential for all known life", answer: "Water" },
        { question: "The smallest planet in our solar system, it is also the closest to the sun", answer: "Mercury" },
        { question: "This colorless, odorless gas makes up about 21% of Earth's atmosphere and is required for human respiration", answer: "Oxygen" },
      ],
      400: [
        { question: "This dense region at the center of an atom contains protons and neutrons", answer: "The nucleus" },
        { question: "Isaac Newton famously described this fundamental force after observing a falling apple", answer: "Gravity" },
      ],
      600: [
        { question: "Robert Hooke coined the name for this basic structural and functional unit of all living organisms", answer: "The cell" },
        { question: "The number of protons in a carbon atom, it is also carbon's atomic number on the periodic table", answer: "6" },
      ],
      800: [
        { question: "With a Mohs hardness rating of 10, this naturally occurring substance is the hardest known material on Earth", answer: "Diamond" },
        { question: "These blood vessels carry oxygenated blood away from the heart to the rest of the body", answer: "Arteries" },
      ],
      1000: [
        { question: "Discovered by J.J. Thomson in 1897, this subatomic particle orbits the nucleus and carries a negative charge", answer: "Electron" },
        { question: "Chlorophyll is essential to this process by which plants convert sunlight and carbon dioxide into glucose", answer: "Photosynthesis" },
      ],
    },
  },
  {
    id: "history",
    name: "History",
    cluesByValue: {
      200: [
        { question: "V-E Day and V-J Day both occurred in this year, marking the end of World War II", answer: "1945" },
        { question: "He presided over the Constitutional Convention and served two terms as the nation's first president", answer: "George Washington" },
        { question: "Its fall in November 1989 symbolized the end of the Cold War and the path toward German reunification", answer: "The Berlin Wall" },
      ],
      400: [
        { question: "Thomas Jefferson drafted this landmark document, adopted by the Continental Congress in 1776", answer: "The Declaration of Independence" },
        { question: "This teenage French peasant led armies to several crucial victories during the Hundred Years' War before being burned at the stake", answer: "Joan of Arc" },
      ],
      600: [
        { question: "On July 20, 1969, this astronaut became the first human being to set foot on the moon", answer: "Neil Armstrong" },
        { question: "This empire completed the iconic Colosseum in 80 AD, using it for gladiatorial contests and public spectacles", answer: "The Roman Empire" },
      ],
      800: [
        { question: "On its maiden voyage in April 1912, this ocean liner struck an iceberg and sank in the North Atlantic", answer: "The Titanic" },
        { question: "He co-authored the Communist Manifesto with Friedrich Engels in 1848 and later wrote Das Kapital", answer: "Karl Marx" },
      ],
      1000: [
        { question: "The storming of the Bastille on July 14th marked the beginning of this revolution, which started in this year", answer: "1789" },
        { question: "She reigned for over 70 years, making her the longest-reigning British monarch in history", answer: "Queen Elizabeth II" },
      ],
    },
  },
  {
    id: "geography",
    name: "Geography",
    cluesByValue: {
      200: [
        { question: "Known as the City of Light, this capital is home to the Eiffel Tower and the Louvre", answer: "Paris" },
        { question: "Covering about 46% of Earth's water surface, this is the largest ocean in the world", answer: "The Pacific Ocean" },
        { question: "Egypt, home to the Great Pyramids of Giza, is located on this continent", answer: "Africa" },
      ],
      400: [
        { question: "Flowing through northeastern Africa for over 4,100 miles, it is generally considered the world's longest river", answer: "The Nile" },
        { question: "Despite Sydney being more famous, this planned city has served as Australia's capital since 1913", answer: "Canberra" },
      ],
      600: [
        { question: "This independent city-state, completely surrounded by Rome, is the world's smallest country by both area and population", answer: "Vatican City" },
        { question: "Mount Everest, the world's highest peak, is part of this mountain range spanning five Asian countries", answer: "The Himalayas" },
      ],
      800: [
        { question: "This country is home to over 60% of the world's lakes, more freshwater lakes than any other nation", answer: "Canada" },
        { question: "Though it receives snowfall, this continent averages less precipitation than any other, earning it the title of driest continent", answer: "Antarctica" },
      ],
      1000: [
        { question: "Located in the Mariana Trench, this is the deepest known location in Earth's oceans, reaching nearly 36,000 feet below the surface", answer: "Challenger Deep" },
        { question: "At its narrowest point, this body of water separating Asia from North America is only 55 miles wide", answer: "The Bering Strait" },
      ],
    },
  },
  {
    id: "pop-culture",
    name: "Pop Culture",
    cluesByValue: {
      200: [
        { question: "He moonwalked his way into history with his 1982 album Thriller, the best-selling album of all time", answer: "Michael Jackson" },
        { question: "This pull-string cowboy doll, voiced by Tom Hanks, leads a group of toys on adventures in the Pixar franchise", answer: "Woody" },
        { question: "Harry Potter receives his acceptance letter to attend this Scottish school of witchcraft and wizardry", answer: "Hogwarts" },
      ],
      400: [
        { question: "Captain Jack Sparrow, played by Johnny Depp, is the roguish hero of this Disney swashbuckling franchise", answer: "Pirates of the Caribbean" },
        { question: "Daenerys Targaryen and Jon Snow vie for this seat of power in a beloved HBO epic fantasy series", answer: "Game of Thrones" },
      ],
      600: [
        { question: "He declared 'I am Iron Man' as Tony Stark on screen and at the conclusion of his real-life Marvel career", answer: "Robert Downey Jr." },
        { question: "Freddie Mercury and his bandmates recorded the six-minute rock epic 'Bohemian Rhapsody' in 1975", answer: "Queen" },
      ],
      800: [
        { question: "He received an Oscar nomination for his role as the ill-fated Jack Dawson in James Cameron's Titanic", answer: "Leonardo DiCaprio" },
        { question: "Bryan Cranston plays a chemistry teacher turned drug kingpin in this acclaimed AMC crime drama", answer: "Breaking Bad" },
      ],
      1000: [
        { question: "He also directed Schindler's List, Saving Private Ryan, and E.T., making him one of Hollywood's most celebrated filmmakers", answer: "Steven Spielberg" },
        { question: "Jack Nicholson delivers the famous line 'You can't handle the truth!' in this 1992 military courtroom drama", answer: "A Few Good Men" },
      ],
    },
  },
  {
    id: "sports",
    name: "Sports",
    cluesByValue: {
      200: [
        { question: "Each NBA team fields this many players on the court at one time during regulation play", answer: "5" },
        { question: "A touchdown in American football earns the scoring team this many points", answer: "6" },
        { question: "The All England Club in London has hosted this sport's most prestigious Grand Slam tournament since 1877", answer: "Tennis" },
      ],
      400: [
        { question: "A standard round of golf consists of this many holes, split into a front nine and a back nine", answer: "18" },
        { question: "This South American nation hosted and won the inaugural FIFA World Cup tournament in 1930", answer: "Uruguay" },
      ],
      600: [
        { question: "The Olympic flag features this many interlocking rings, each representing one of the world's inhabited continents", answer: "5" },
        { question: "This city hosted the Summer Olympics for the third time in 2012, more than any other city at the time", answer: "London" },
      ],
      800: [
        { question: "With 23 gold medals, this American swimmer holds the record for the most Olympic gold medals of all time", answer: "Michael Phelps" },
        { question: "Batters in baseball are retired on a strikeout after accumulating this many strikes", answer: "3" },
      ],
      1000: [
        { question: "This Boston Celtics center won 11 NBA championships as a player, the most in league history", answer: "Bill Russell" },
        { question: "Though often associated with Asia today, this country invented and first codified the rules of table tennis in the late 1800s", answer: "England" },
      ],
    },
  },
  {
    id: "literature",
    name: "Literature",
    cluesByValue: {
      200: [
        { question: "This Elizabethan playwright penned the tragic love story of the feuding Montagues and Capulets", answer: "William Shakespeare" },
        { question: "Under this pen name, Theodor Seuss Geisel created beloved children's books including Green Eggs and Ham", answer: "Dr. Seuss" },
        { question: "This is the first name of the author who used the pen name George Orwell and wrote Animal Farm", answer: "Eric" },
      ],
      400: [
        { question: "This dystopian novel, depicting a totalitarian society under the ever-watchful gaze of Big Brother, was published in 1949", answer: "1984" },
        { question: "He created the pipe-smoking detective of 221B Baker Street and his loyal companion, Dr. Watson", answer: "Arthur Conan Doyle" },
      ],
      600: [
        { question: "She published her beloved novel about Elizabeth Bennet and Mr. Darcy anonymously in 1813", answer: "Jane Austen" },
        { question: "Samuel Clemens used this pen name when he wrote The Adventures of Huckleberry Finn", answer: "Mark Twain" },
      ],
      800: [
        { question: "Ancient Greek tradition attributes both the Iliad and the Odyssey to this blind poet", answer: "Homer" },
        { question: "Set on Long Island's Gold Coast during the Jazz Age, his masterpiece examines the hollowness of the American Dream", answer: "F. Scott Fitzgerald" },
      ],
      1000: [
        { question: "This Colombian author's magical realist saga about the Buendía family earned him the Nobel Prize in Literature in 1982", answer: "Gabriel García Márquez" },
        { question: "This 17th century English poet went blind before dictating his epic poem Paradise Lost to his daughters", answer: "John Milton" },
      ],
    },
  },
  {
    id: "technology",
    name: "Technology",
    cluesByValue: {
      200: [
        { question: "The brain of a computer, it executes instructions and performs calculations — its full name is this three-word phrase", answer: "Central Processing Unit" },
        { question: "Founded in a garage in 1976 by Steve Jobs and Steve Wozniak, this company introduced the iPhone in 2007", answer: "Apple" },
        { question: "The string of characters you type into a browser's address bar to visit a website; its full name is this", answer: "Uniform Resource Locator" },
      ],
      400: [
        { question: "Web developers use this markup language to structure the content of pages on the World Wide Web", answer: "HyperText Markup Language" },
        { question: "Your computer uses this type of fast, volatile memory to store data that programs are actively using", answer: "Random Access Memory" },
      ],
      600: [
        { question: "Bill Gates co-founded Microsoft with this childhood friend in 1975 in Albuquerque, New Mexico", answer: "Paul Allen" },
        { question: "Created by Brendan Eich in just 10 days in 1995, this language now powers both browser interactivity and server-side development via Node", answer: "JavaScript" },
      ],
      800: [
        { question: "Developed by Linus Torvalds starting in 1991, this open-source kernel powers Android, most web servers, and the majority of supercomputers", answer: "Linux" },
        { question: "When you see the padlock icon in your browser's address bar, it means your connection is protected by this encrypted protocol", answer: "HTTPS" },
      ],
      1000: [
        { question: "Originally designed to accelerate graphics rendering, this processing unit's parallel architecture now powers AI and machine learning workloads", answer: "Graphics Processing Unit" },
        { question: "This declarative language, standardized in 1986, lets you query and manipulate relational databases using commands like SELECT, INSERT, and JOIN", answer: "SQL" },
      ],
    },
  },
  {
    id: "food",
    name: "Food and Drink",
    cluesByValue: {
      200: [
        { question: "This elongated yellow fruit is a leading source of potassium and the world's most popular fruit by export volume", answer: "Banana" },
        { question: "The world's most widely consumed beverage after water, it is made by steeping dried leaves in hot water", answer: "Tea" },
        { question: "Mozzarella is the most popular variety of this dairy product used as a pizza topping", answer: "Cheese" },
      ],
      400: [
        { question: "Vinegared rice combined with raw fish is the hallmark of this country's most internationally recognized cuisine", answer: "Japan" },
        { question: "Most pasta is made from semolina flour milled from this hard grain variety", answer: "Wheat" },
      ],
      600: [
        { question: "Blended with tahini, lemon juice, and garlic, this legume is the primary ingredient in hummus", answer: "Chickpeas" },
        { question: "In upscale French dining, this phrase — meaning 'let the chef choose' — describes a tasting menu selected entirely at the cook's discretion", answer: "Menu dégustation" },
      ],
      800: [
        { question: "Citrus fruits like oranges and lemons are famous for their high concentrations of this vitamin, which prevents scurvy", answer: "Vitamin C" },
        { question: "The world's most expensive spice by weight, it comes from the hand-harvested dried stigmas of the Crocus sativus flower", answer: "Saffron" },
      ],
      1000: [
        { question: "Jerky and dried fruit are made through this preservation process, which removes moisture to inhibit bacterial growth", answer: "Dehydration" },
        { question: "This Italian coffee drink — literally meaning 'milk' in Italian — combines a shot of espresso with a generous pour of steamed milk", answer: "Latte" },
      ],
    },
  },
  {
    id: "mythology",
    name: "Mythology",
    cluesByValue: {
      200: [
        { question: "This Greek king of the gods hurls thunderbolts from Mount Olympus", answer: "Zeus" },
        { question: "Achilles' only vulnerable spot on his body, this gave us a term for a critical weakness", answer: "His heel" },
        { question: "The Roman god of love, he carries a bow and golden arrows", answer: "Cupid" },
      ],
      400: [
        { question: "This Greek hero slew the Medusa and later rescued Andromeda from a sea monster", answer: "Perseus" },
        { question: "Odysseus spent 10 years trying to return home to this island after the Trojan War", answer: "Ithaca" },
        { question: "The wife of Zeus, she is also the goddess of marriage and queen of Mount Olympus", answer: "Hera" },
      ],
      600: [
        { question: "In Norse mythology, this one-eyed god hung from the World Tree for nine days to discover the runes", answer: "Odin" },
        { question: "Prometheus was punished by the gods for giving this gift to humanity", answer: "Fire" },
        { question: "She had snakes for hair and could turn anyone who looked at her to stone", answer: "Medusa" },
      ],
      800: [
        { question: "The Minotaur was kept in a labyrinth on this Greek island, ruled by King Minos", answer: "Crete" },
        { question: "This Egyptian god of the dead has the head of a jackal and weighs souls against a feather", answer: "Anubis" },
      ],
      1000: [
        { question: "In Greek mythology, this Titan holds up the celestial heavens on his shoulders as punishment from Zeus", answer: "Atlas" },
        { question: "This river in the underworld had waters that caused complete forgetfulness in those who drank from it", answer: "The River Lethe" },
      ],
    },
  },
  {
    id: "silver-screen",
    name: "Silver Screen",
    cluesByValue: {
      200: [
        { question: "Simba reclaims his place as king of the Pride Lands in this 1994 Disney animated film", answer: "The Lion King" },
        { question: "A young wizard discovers he is famous in the wizarding world on his 11th birthday in this 2001 film", answer: "Harry Potter and the Sorcerer's Stone" },
        { question: "Tom Hanks plays a man stranded on a deserted island with only a volleyball named Wilson for company", answer: "Cast Away" },
      ],
      400: [
        { question: "This 1972 Francis Ford Coppola crime epic centers on the Corleone family and 'an offer you can't refuse'", answer: "The Godfather" },
        { question: "Neo is offered a choice between a red pill and a blue pill in this 1999 sci-fi action film", answer: "The Matrix" },
        { question: "Elsa sings 'Let It Go' while building an ice palace in this 2013 Disney animated blockbuster", answer: "Frozen" },
      ],
      600: [
        { question: "This Steven Spielberg film about great white shark attacks made audiences afraid to go in the water in 1975", answer: "Jaws" },
        { question: "An archaeologist and adventurer played by Harrison Ford searches for biblical artifacts in this franchise", answer: "Indiana Jones" },
      ],
      800: [
        { question: "Anthony Hopkins plays Dr. Hannibal Lecter, a cannibalistic psychiatrist, in this 1991 Oscar-winning thriller", answer: "The Silence of the Lambs" },
        { question: "This 1977 Woody Allen romantic comedy, widely considered one of the greatest films ever made, is named after a character played by Diane Keaton", answer: "Annie Hall" },
      ],
      1000: [
        { question: "Akira Kurosawa's 1954 Japanese epic about seven samurai protecting a village inspired the American western The Magnificent Seven", answer: "Seven Samurai" },
        { question: "This 1968 Stanley Kubrick film ends with an astronaut entering a mysterious monolith near Jupiter and transforming into a 'Star Child'", answer: "2001: A Space Odyssey" },
      ],
    },
  },
  {
    id: "music",
    name: "Music",
    cluesByValue: {
      200: [
        { question: "This British band's 1967 album Sgt. Pepper's Lonely Hearts Club Band is often called the greatest rock album ever made", answer: "The Beatles" },
        { question: "She sang 'Rolling in the Deep' and 'Hello,' winning 10 Grammy Awards in a single night in 2012", answer: "Adele" },
        { question: "This instrument, played by Itzhak Perlman and Yo-Yo Ma respectively, are the lead strings of a classical orchestra", answer: "Violin and cello" },
      ],
      400: [
        { question: "'Purple Rain,' 'When Doves Cry,' and 'Kiss' are among the signature hits of this Minneapolis-born musical genius", answer: "Prince" },
        { question: "Bob Dylan won the Nobel Prize in Literature in 2016, recognized for creating new poetic expressions within this art form", answer: "Song" },
        { question: "This annual music festival held on a farm in Glastonbury, England is one of the world's largest", answer: "Glastonbury Festival" },
      ],
      600: [
        { question: "The opening four notes of this Beethoven symphony — dit-dit-dit-dah — may be the most famous motif in classical music", answer: "Symphony No. 5" },
        { question: "Tupac Shakur and The Notorious B.I.G., rivals in this feud between coasts, were both murdered in drive-by shootings in 1996 and 1997", answer: "East Coast-West Coast rap feud" },
      ],
      800: [
        { question: "This 'King of Rock and Roll' recorded 'Heartbreak Hotel,' 'Hound Dog,' and 'Jailhouse Rock' in the 1950s", answer: "Elvis Presley" },
        { question: "Carlos Santana revived his career with this 1999 album featuring collaborations with Rob Thomas, Everlast, and others", answer: "Supernatural" },
      ],
      1000: [
        { question: "A diminuendo is the gradual decrease in musical volume; its opposite, a gradual increase, is known by this Italian term", answer: "Crescendo" },
        { question: "Nicknamed the 'Empress of the Blues,' this 1920s singer sold millions of records and influenced virtually every blues and jazz vocalist who followed", answer: "Bessie Smith" },
      ],
    },
  },
  {
    id: "us-presidents",
    name: "U.S. Presidents",
    cluesByValue: {
      200: [
        { question: "He chopped down a cherry tree (according to legend) and is pictured on the one-dollar bill", answer: "George Washington" },
        { question: "This president issued the Emancipation Proclamation in 1863 and was assassinated at Ford's Theatre", answer: "Abraham Lincoln" },
        { question: "His New Deal programs helped lift America out of the Great Depression; he served four terms in office", answer: "Franklin D. Roosevelt" },
      ],
      400: [
        { question: "At 43 years old, he was the youngest person ever elected President of the United States", answer: "John F. Kennedy" },
        { question: "He resigned the presidency in 1974 in the wake of the Watergate scandal", answer: "Richard Nixon" },
        { question: "This peanut farmer from Georgia served as the 39th president and later won the Nobel Peace Prize", answer: "Jimmy Carter" },
      ],
      600: [
        { question: "He famously said 'Tear down this wall!' at the Brandenburg Gate in 1987, challenging Soviet leader Gorbachev", answer: "Ronald Reagan" },
        { question: "This Harvard-educated lawyer became the first African American president of the United States in 2009", answer: "Barack Obama" },
      ],
      800: [
        { question: "Though William Henry Harrison served as president, he holds the record for the shortest presidency in U.S. history — dying after just 31 days in office", answer: "William Henry Harrison" },
        { question: "He served as both Vice President and President without ever being elected to either office, after Nixon's VP Spiro Agnew resigned", answer: "Gerald Ford" },
      ],
      1000: [
        { question: "He is the only U.S. President to have served two non-consecutive terms, winning in 1884 and again in 1892", answer: "Grover Cleveland" },
        { question: "This future president served as Supreme Allied Commander in Europe during WWII before winning the presidency in 1952", answer: "Dwight D. Eisenhower" },
      ],
    },
  },
  {
    id: "wild-kingdom",
    name: "Wild Kingdom",
    cluesByValue: {
      200: [
        { question: "The largest land animal on Earth, this African mammal has tusks and a trunk and never forgets", answer: "The elephant" },
        { question: "Often called 'man's best friend,' this domesticated mammal descended from wolves", answer: "The dog" },
        { question: "This flightless bird of Antarctica huddles in large groups to survive brutal winters and raises its young on its feet", answer: "The penguin" },
      ],
      400: [
        { question: "Unlike their placental counterparts, these mammals carry their underdeveloped young in a pouch; the kangaroo is the most famous example", answer: "Marsupials" },
        { question: "The world's fastest land animal, it can accelerate from 0 to 70 mph in just 3 seconds", answer: "The cheetah" },
        { question: "These colonial insects live in hierarchical societies with a queen, workers, and drones, and produce honey", answer: "Honeybees" },
      ],
      600: [
        { question: "The largest species of shark, reaching up to 40 feet, this filter-feeder dines exclusively on plankton and small fish", answer: "The whale shark" },
        { question: "Known for their intelligence and use of tools, these great apes share approximately 98.7% of their DNA with humans", answer: "Chimpanzees" },
      ],
      800: [
        { question: "A group of these pink birds is called a flamboyance; they stand on one leg to conserve body heat", answer: "Flamingos" },
        { question: "The electric eel is not actually an eel but belongs to this class of animals that also includes catfish and goldfish", answer: "Fish" },
      ],
      1000: [
        { question: "This large, slow-moving reptile can live over 150 years and was Charles Darwin's famous companion on the Galapagos Islands", answer: "The giant tortoise" },
        { question: "Axolotls — the 'Peter Pan' of salamanders — are native to this lake complex in central Mexico and can regenerate entire limbs", answer: "Lake Xochimilco" },
      ],
    },
  },
  {
    id: "broadway",
    name: "Broadway",
    cluesByValue: {
      200: [
        { question: "Elphaba and Glinda are rivals-turned-friends in this hit musical prequel to The Wizard of Oz", answer: "Wicked" },
        { question: "Based on Victor Hugo's novel, this musical features Jean Valjean, Inspector Javert, and the song 'I Dreamed a Dream'", answer: "Les Misérables" },
        { question: "Andrew Lloyd Webber's show about a disfigured musical genius haunting the Paris Opera House", answer: "The Phantom of the Opera" },
      ],
      400: [
        { question: "Set in 1975 Chicago, this Kander & Ebb musical follows Roxie Hart and Velma Kelly through murder and showbiz", answer: "Chicago" },
        { question: "Lin-Manuel Miranda blended hip-hop and history in this Pulitzer Prize-winning musical about the Founding Father Alexander Hamilton", answer: "Hamilton" },
        { question: "High school sweethearts Danny and Sandy reunite in this 1971 musical set at Rydell High, later a beloved film", answer: "Grease" },
      ],
      600: [
        { question: "Tony and Maria, a Jet and a Shark's girlfriend, fall in love in this musical retelling of Romeo and Juliet set in 1950s New York", answer: "West Side Story" },
        { question: "This 2003 rock musical by Green Day set in a post-apocalyptic America was later turned into a film starring Billy Joe Armstrong's son", answer: "American Idiot" },
      ],
      800: [
        { question: "In this Rodgers & Hammerstein musical, Maria leaves her Austrian convent to be governess to the von Trapp children", answer: "The Sound of Music" },
        { question: "Set in the 1960s East Village, this Jonathan Larson rock musical inspired by La Bohème explores life amid the AIDS epidemic", answer: "Rent" },
      ],
      1000: [
        { question: "This 1957 Bernstein and Sondheim musical premiered on Broadway with Carol Lawrence as Maria and Larry Kert as Tony", answer: "West Side Story" },
        { question: "Sweeney Todd, the Demon Barber of this street, dispatches victims and bakes them into pies in Sondheim's acclaimed musical", answer: "Fleet Street" },
      ],
    },
  },
  {
    id: "word-origins",
    name: "Word Origins",
    cluesByValue: {
      200: [
        { question: "The word 'sandwich' is named after this English earl, who supposedly ate meat between bread slices so he wouldn't have to leave the gaming table", answer: "The Earl of Sandwich" },
        { question: "The month of July is named after this Roman general and dictator", answer: "Julius Caesar" },
        { question: "From the Greek word for 'wandering star,' this term describes the celestial bodies that orbit the sun", answer: "Planet" },
      ],
      400: [
        { question: "The word 'hazard' entered English from the Arabic word 'az-zahr,' meaning this game of chance", answer: "Dice" },
        { question: "This word for a sudden violent downpour comes from the French 'déluge,' derived from the Latin for 'to wash away'", answer: "Deluge" },
        { question: "The word 'muscle' comes from the Latin 'musculus,' meaning this small animal, because a flexed muscle resembles one moving under the skin", answer: "Mouse" },
      ],
      600: [
        { question: "The word 'assassin' derives from an Arabic term meaning users of this drug, allegedly consumed by a medieval sect of killers", answer: "Hashish" },
        { question: "This word for the place one comes from shares its origin with the Latin word 'patricius,' meaning nobleman", answer: "Patriot" },
      ],
      800: [
        { question: "The word 'tragedy' comes from the Greek 'tragodia,' literally meaning this animal's song", answer: "Goat song" },
        { question: "The word 'salary' comes from the Latin 'salarium,' because Roman soldiers were sometimes paid in this mineral", answer: "Salt" },
      ],
      1000: [
        { question: "The word 'algorithm' derives from the Latinized name of this 9th-century Persian mathematician who also gave us the word 'algebra'", answer: "Al-Khwarizmi" },
        { question: "The word 'denim' traces back to the French phrase 'serge de Nîmes,' referring to a fabric made in this city in southern France", answer: "Nîmes" },
      ],
    },
  },
  {
    id: "famous-firsts",
    name: "Famous Firsts",
    cluesByValue: {
      200: [
        { question: "On December 17, 1903, these two brothers made the first successful powered airplane flight at Kitty Hawk, North Carolina", answer: "The Wright Brothers" },
        { question: "This country's women were the first in the world to gain the right to vote, doing so in 1893", answer: "New Zealand" },
        { question: "He became the first man to set foot on the moon on July 20, 1969", answer: "Neil Armstrong" },
      ],
      400: [
        { question: "This Russian cosmonaut became the first human to travel to space, completing one orbit of Earth on April 12, 1961", answer: "Yuri Gagarin" },
        { question: "In 1928, this Scottish bacteriologist discovered penicillin by noticing mold killing bacteria in his Petri dishes", answer: "Alexander Fleming" },
        { question: "The first email was sent in 1971 by this programmer who chose the @ symbol to separate the user from the machine", answer: "Ray Tomlinson" },
      ],
      600: [
        { question: "Tim Berners-Lee invented this system in 1989 while working at CERN, initially to share research information among scientists", answer: "The World Wide Web" },
        { question: "Edmund Hillary and Tenzing Norgay were the first to summit this peak, doing so on May 29, 1953", answer: "Mount Everest" },
      ],
      800: [
        { question: "In 1955, Rosa Parks refused to give up her seat on a Montgomery, Alabama bus, sparking a 381-day boycott that became a landmark event in this movement", answer: "The Civil Rights Movement" },
        { question: "Marie Curie became the first person to win Nobel Prizes in two different sciences — physics in 1903, and this field in 1911", answer: "Chemistry" },
      ],
      1000: [
        { question: "Dolly, the sheep born in 1996 at the Roslin Institute in Scotland, was the first mammal successfully created by this scientific process", answer: "Cloning" },
        { question: "In 1439, Johannes Gutenberg introduced this invention to Europe, revolutionizing the spread of knowledge by making mass book production possible", answer: "The printing press" },
      ],
    },
  },
  {
    id: "by-the-numbers",
    name: "By the Numbers",
    cluesByValue: {
      200: [
        { question: "The number of sides on a stop sign", answer: "8" },
        { question: "At 100°C, this is the boiling point of water at sea level — the scale is named for this Swedish astronomer", answer: "Celsius" },
        { question: "The number of players on a soccer field per team during a standard match", answer: "11" },
      ],
      400: [
        { question: "The approximate number of bones in the adult human body", answer: "206" },
        { question: "A baker's dozen equals this number, one more than a standard dozen", answer: "13" },
        { question: "The number of amendments in the U.S. Bill of Rights, ratified in 1791", answer: "10" },
      ],
      600: [
        { question: "A light-year is approximately 5.88 of these units, allowing astronomers to describe vast cosmic distances", answer: "Trillion miles" },
        { question: "In Roman numerals, MMXXVI equals this year, which is when today's game is being played", answer: "2026" },
      ],
      800: [
        { question: "A perfect game in bowling requires this many consecutive strikes", answer: "12" },
        { question: "Pi, the ratio of a circle's circumference to its diameter, begins with these five digits after the decimal", answer: "14159" },
      ],
      1000: [
        { question: "The speed of light in a vacuum, rounded to the nearest million, is approximately this many meters per second", answer: "300 million" },
        { question: "In the Fibonacci sequence 1, 1, 2, 3, 5, 8, 13... the next number is this", answer: "21" },
      ],
    },
  },
  {
    id: "body-language",
    name: "Body Language",
    cluesByValue: {
      200: [
        { question: "This organ, weighing about 3 pounds and protected by the skull, is the control center of the nervous system", answer: "The brain" },
        { question: "Containing about 60,000 miles of blood vessels, the human body's circulatory pump is this organ", answer: "The heart" },
        { question: "The largest organ of the human body by surface area, it protects us from heat, cold, and germs", answer: "Skin" },
      ],
      400: [
        { question: "This large muscle in your upper arm that contracts to flex the forearm is a gym goer's pride and joy", answer: "The bicep" },
        { question: "The femur, located here, is the longest and strongest bone in the human body", answer: "The thigh" },
        { question: "Also called the voice box, this structure in the throat contains the vocal cords", answer: "The larynx" },
      ],
      600: [
        { question: "The human eye contains two types of photoreceptor cells: cones for color and these for low-light vision", answer: "Rods" },
        { question: "This small gland at the base of the brain is often called the 'master gland' because it controls other glands' hormone production", answer: "The pituitary gland" },
      ],
      800: [
        { question: "The liver produces this yellow-green fluid, stored in the gallbladder, to help digest fats in the small intestine", answer: "Bile" },
        { question: "The smallest bones in the human body are the malleus, incus, and stapes, collectively known as the ossicles; they're located in this organ", answer: "The ear" },
      ],
      1000: [
        { question: "The SA node, or sinoatrial node, is the heart's natural pacemaker; it is located in this chamber of the heart", answer: "The right atrium" },
        { question: "Named after its discoverer, the fallopian tubes are part of the reproductive anatomy of this organ system", answer: "The female reproductive system" },
      ],
    },
  },
  {
    id: "famous-nicknames",
    name: "Famous Nicknames",
    cluesByValue: {
      200: [
        { question: "Muhammad Ali gave himself this nickname, declaring himself 'The Greatest'", answer: "The Greatest" },
        { question: "Frank Sinatra earned this nickname for his smooth, effortless style and ability to improvise", answer: "Ol' Blue Eyes" },
        { question: "Nicknamed 'The King,' this musician ruled rock and roll from Graceland in Memphis, Tennessee", answer: "Elvis Presley" },
      ],
      400: [
        { question: "Nicknamed 'The Great Emancipator,' he issued the order freeing enslaved people in Confederate states in 1863", answer: "Abraham Lincoln" },
        { question: "This jazz trumpeter was nicknamed 'Satchmo' — short for 'Satchel Mouth' — a reference to his wide, embouchure-stretching smile", answer: "Louis Armstrong" },
        { question: "Known as 'The Voice,' this Italian-American crooner recorded over 100 albums and starred in the Rat Pack", answer: "Frank Sinatra" },
      ],
      600: [
        { question: "Soccer legend Edson Arantes do Nascimento is universally known by this one-word nickname", answer: "Pelé" },
        { question: "Nicknamed 'The Rocket Man' by the media, this pop star's real name is Reginald Kenneth Dwight", answer: "Elton John" },
      ],
      800: [
        { question: "This 19th century female nurse earned the nickname 'The Lady with the Lamp' for her nighttime rounds during the Crimean War", answer: "Florence Nightingale" },
        { question: "Al Capone earned this colorful nickname, believed to come from a scar on his cheek from a knife fight in Brooklyn", answer: "Scarface" },
      ],
      1000: [
        { question: "This German-born physicist, known for E=mc², was nicknamed 'The Absent-Minded Professor' by colleagues despite his brilliant mind", answer: "Albert Einstein" },
        { question: "Catherine II of Russia earned this epithet for her ambitious military campaigns and cultural reforms during her 34-year reign", answer: "Catherine the Great" },
      ],
    },
  },
  {
    id: "art-artists",
    name: "Art & Artists",
    cluesByValue: {
      200: [
        { question: "This Dutch post-impressionist painter cut off part of his own ear and created 'The Starry Night' and 'Sunflowers'", answer: "Vincent van Gogh" },
        { question: "Leonardo da Vinci's famous anatomical drawing depicts a man inscribed in a circle and a square; it's called this", answer: "The Vitruvian Man" },
        { question: "Pablo Picasso co-founded this revolutionary art movement characterized by fragmented objects shown from multiple viewpoints simultaneously", answer: "Cubism" },
      ],
      400: [
        { question: "This Spanish surrealist is famous for his melting clocks painting, 'The Persistence of Memory'", answer: "Salvador Dalí" },
        { question: "Michelangelo painted the Sistine Chapel ceiling while lying on scaffolding; it was commissioned by this pope", answer: "Pope Julius II" },
        { question: "This American artist became famous for his soup can paintings and celebrity silk screens, leading the Pop Art movement", answer: "Andy Warhol" },
      ],
      600: [
        { question: "This Dutch master created 'Girl with a Pearl Earring' and 'The Milkmaid' in 17th-century Delft", answer: "Johannes Vermeer" },
        { question: "Frida Kahlo, the Mexican painter known for her self-portraits, was married twice to this famous muralist", answer: "Diego Rivera" },
      ],
      800: [
        { question: "Auguste Rodin's most famous sculpture depicts a man deep in thought, seated with his chin resting on his hand", answer: "The Thinker" },
        { question: "This Japanese artist's woodblock print 'The Great Wave off Kanagawa' is one of the most recognized works of art in the world", answer: "Katsushika Hokusai" },
      ],
      1000: [
        { question: "Jackson Pollock pioneered this technique of dripping, pouring, and splashing paint onto a canvas laid on the floor", answer: "Action painting" },
        { question: "The Louvre, home to the Mona Lisa, the Venus de Milo, and over 35,000 artworks, is located in this city", answer: "Paris" },
      ],
    },
  },
];

const round2Bank: Array<CategoryBank<Round2Value>> = [
  {
    id: "science",
    name: "Science",
    cluesByValue: {
      400: [
        { question: "Making up about 78% of Earth's atmosphere, this colorless gas is its most abundant component", answer: "Nitrogen" },
        { question: "Derived from the Latin word 'ferrum,' this is the chemical symbol for iron on the periodic table", answer: "Fe" },
      ],
      800: [
        { question: "Albert Einstein described this force as a curvature in spacetime; it also keeps planets locked in their orbits around stars", answer: "Gravity" },
        { question: "Evangelista Torricelli invented this instrument in 1643 to measure atmospheric pressure", answer: "Barometer" },
      ],
      1200: [
        { question: "Unlike ionic bonds, this type of chemical bond involves the sharing of electron pairs between two atoms", answer: "Covalent bond" },
        { question: "His three laws of motion, published in Principia Mathematica in 1687, form the foundation of classical mechanics", answer: "Isaac Newton" },
      ],
      1600: [
        { question: "Known as the powerhouse of the cell, this organelle generates most of a cell's supply of ATP through cellular respiration", answer: "Mitochondria" },
        { question: "James Chadwick discovered this neutrally charged subatomic particle residing in the atomic nucleus in 1932", answer: "Neutron" },
      ],
      2000: [
        { question: "Denoted by the letter c, this is the speed of light in a vacuum, measured in meters per second, to the nearest integer", answer: "299,792,458" },
        { question: "This branch of physics, developed in the early 20th century, governs the behavior of matter and energy at subatomic scales", answer: "Quantum mechanics" },
      ],
    },
  },
  {
    id: "history",
    name: "History",
    cluesByValue: {
      400: [
        { question: "Built in the 15th century at over 7,900 feet above sea level in Peru, this mountain citadel was constructed by this South American civilization", answer: "The Inca" },
        { question: "After defeating Mark Antony and Cleopatra, this grandnephew of Julius Caesar became Rome's first emperor", answer: "Augustus" },
      ],
      800: [
        { question: "The assassination of Archduke Franz Ferdinand in Sarajevo set off a chain of events that started this global conflict in 1914", answer: "World War I" },
        { question: "Through nonviolent civil disobedience, including the famous Salt March of 1930, this leader guided India toward independence from Britain", answer: "Mahatma Gandhi" },
      ],
      1200: [
        { question: "Signed in the Hall of Mirrors at Versailles in 1919, this document officially ended World War I and imposed severe penalties on Germany", answer: "The Treaty of Versailles" },
        { question: "He led the Soviet Union from 1924 until his death in 1953, serving as its paramount leader through most of World War II", answer: "Joseph Stalin" },
      ],
      1600: [
        { question: "Spanning over 4,000 miles, this ancient network of trade routes connected China, Central Asia, and Europe for centuries", answer: "The Silk Road" },
        { question: "Nicknamed the Iron Lady, she became Britain's first female Prime Minister when her Conservative Party won in 1979", answer: "Margaret Thatcher" },
      ],
      2000: [
        { question: "The fall of this Byzantine capital to Ottoman forces in this year is often cited as marking the end of the Middle Ages", answer: "1453" },
        { question: "Despite lasting only 15 years, this dynasty unified China in 221 BCE and ultimately gave the country its name", answer: "The Qin Dynasty" },
      ],
    },
  },
  {
    id: "geography",
    name: "Geography",
    cluesByValue: {
      400: [
        { question: "Home to over 4.5 billion people, this continent accounts for roughly 30% of Earth's total land area", answer: "Asia" },
        { question: "Stretching over 4,300 miles along the western coast of South America, it is the world's longest continental mountain range", answer: "The Andes" },
      ],
      800: [
        { question: "Covering roughly 3.6 million square miles, this desert dominates most of North Africa and is the world's largest hot desert", answer: "The Sahara" },
        { question: "One of the two defining rivers of ancient Mesopotamia, this river flows through the Iraqi capital of Baghdad", answer: "The Tigris" },
      ],
      1200: [
        { question: "Though Auckland is larger, this harbor city on the North Island has served as New Zealand's capital since 1865", answer: "Wellington" },
        { question: "Opened in 1869 and connecting the Mediterranean Sea to the Red Sea, it is one of the world's most heavily used shipping lanes", answer: "The Suez Canal" },
      ],
      1600: [
        { question: "Surrounded entirely by open ocean in the North Atlantic, this is the only sea on Earth with no land boundaries whatsoever", answer: "The Sargasso Sea" },
        { question: "In 2019 this Kazakhstani capital was renamed Nur-Sultan; in 2022 it reverted to this name, which it holds today", answer: "Astana" },
      ],
      2000: [
        { question: "Japan sits at the convergence of several tectonic plates, but the majority of its islands rest atop this one", answer: "The Eurasian Plate" },
        { question: "This imaginary line of latitude at approximately 23.5 degrees north marks the northernmost point where the sun can appear directly overhead", answer: "The Tropic of Cancer" },
      ],
    },
  },
  {
    id: "pop-culture",
    name: "Pop Culture",
    cluesByValue: {
      400: [
        { question: "She named her 2014 album after her birth year and scored a massive hit with 'Shake It Off'", answer: "Taylor Swift" },
        { question: "George Lucas created this space opera franchise, featuring Jedi knights and their eternal battle against the dark side of the Force", answer: "Star Wars" },
      ],
      800: [
        { question: "This Canadian comedian provided the distinctive Scottish accent for the lovable ogre in the 2001 DreamWorks animated film", answer: "Mike Myers" },
        { question: "This Korean Netflix series, in which cash-strapped contestants risk their lives in children's games, became the platform's most-watched non-English show after its 2021 debut", answer: "Squid Game" },
      ],
      1200: [
        { question: "His 2015 concept album 'To Pimp a Butterfly' is widely considered one of the greatest rap albums of all time", answer: "Kendrick Lamar" },
        { question: "House Stark and House Lannister vie for power in this sprawling HBO fantasy epic based on George R.R. Martin's novels", answer: "Game of Thrones" },
      ],
      1600: [
        { question: "His non-linear crime anthology featuring John Travolta, Samuel L. Jackson, and Uma Thurman won the Palme d'Or at Cannes in 1994", answer: "Quentin Tarantino" },
        { question: "With hits spanning five decades, from 'Like a Virgin' to 'Vogue,' this pop icon has sold over 300 million records worldwide", answer: "Madonna" },
      ],
      2000: [
        { question: "Released in 1995, this Pixar film about a cowboy doll and a space-ranger action figure was the world's first fully computer-animated feature film", answer: "Toy Story" },
        { question: "This German-British composer created the iconic low brass 'BRAAAM' sound featured in the Inception trailer and scored The Dark Knight trilogy", answer: "Hans Zimmer" },
      ],
    },
  },
  {
    id: "sports",
    name: "Sports",
    cluesByValue: {
      400: [
        { question: "Olympic swimming events take place in a pool of this length, measured in meters", answer: "50" },
        { question: "This South American nation has lifted the FIFA World Cup trophy a record five times, more than any other country", answer: "Brazil" },
      ],
      800: [
        { question: "When a team takes the field in baseball, it places exactly this many players in defensive positions", answer: "9" },
        { question: "Achieved by rolling 12 consecutive strikes, this is the maximum possible score in a game of ten-pin bowling", answer: "300" },
      ],
      1200: [
        { question: "Played at Roland Garros on red clay courts each spring, this Grand Slam tournament is synonymous with Rafael Nadal's record dominance", answer: "The French Open" },
        { question: "A standard soccer match consists of two 45-minute halves, for this total number of minutes of regulation play", answer: "90" },
      ],
      1600: [
        { question: "He proclaimed himself 'The Greatest' and backed it up with three heavyweight championship reigns and a 56-5 professional record", answer: "Muhammad Ali" },
        { question: "This Midwestern city lends its name to a 500-mile auto race held annually at its famous Speedway on Memorial Day weekend", answer: "Indianapolis" },
      ],
      2000: [
        { question: "Each May at Churchill Downs in Louisville, thoroughbreds compete in this first leg of the Triple Crown, nicknamed the Run for the Roses", answer: "The Kentucky Derby" },
        { question: "In cricket, a batsman who is dismissed without scoring a single run is said to have scored this, named after the egg-shaped zero", answer: "Duck" },
      ],
    },
  },
  {
    id: "literature",
    name: "Literature",
    cluesByValue: {
      400: [
        { question: "This American author drew on his own seafaring experiences to write his 1851 novel about Captain Ahab's obsession with a white whale", answer: "Herman Melville" },
        { question: "An Oxford professor of Anglo-Saxon, he built the languages and world of Middle-earth for his 1937 novel about the hobbit Bilbo Baggins", answer: "J.R.R. Tolkien" },
      ],
      800: [
        { question: "This Nobel Prize-winning author set her harrowing 1987 novel about slavery's legacy in post-Civil War Ohio", answer: "Toni Morrison" },
        { question: "This 19th century Russian master explored guilt and redemption through the story of the student-murderer Raskolnikov", answer: "Fyodor Dostoevsky" },
      ],
      1200: [
        { question: "A master of the macabre, this American writer published his haunting poem about a mysterious bird's midnight visit in 1845", answer: "Edgar Allan Poe" },
        { question: "This Italian poet wrote his epic three-part journey through Hell, Purgatory, and Paradise in the early 14th century", answer: "Dante Alighieri" },
      ],
      1600: [
        { question: "His final novel, published in 1880, examines faith, doubt, and moral responsibility through a Russian family's parricide", answer: "Fyodor Dostoevsky" },
        { question: "This Irish-French playwright's 1953 absurdist drama, in which two men wait endlessly for someone who never arrives, is a cornerstone of the Theatre of the Absurd", answer: "Samuel Beckett" },
      ],
      2000: [
        { question: "This Irish modernist writer's 1922 novel, set over a single day in Dublin, is considered one of the most important works in the English language", answer: "James Joyce" },
        { question: "This Nobel laureate used multiple narrators and stream of consciousness to tell the story of the declining Compson family in the American South", answer: "William Faulkner" },
      ],
    },
  },
  {
    id: "technology",
    name: "Technology",
    cluesByValue: {
      400: [
        { question: "Software developers use this type of interface to allow different applications to communicate with each other programmatically", answer: "Application Programming Interface" },
        { question: "Though originally developed by Android Inc., this tech giant acquired the company in 2005 and turned it into the world's most used mobile OS", answer: "Google" },
      ],
      800: [
        { question: "Your browser uses this foundational application-layer protocol to request and receive web pages from servers across the internet", answer: "HTTP" },
        { question: "Unlike traditional hard drives, this type of storage device uses flash memory chips and contains no moving mechanical parts", answer: "Solid State Drive" },
      ],
      1200: [
        { question: "Web developers use this stylesheet language to control the visual presentation — colors, fonts, and layout — of HTML documents", answer: "CSS" },
        { question: "This lightweight, human-readable data interchange format is the backbone of modern web APIs and is derived from JavaScript object syntax", answer: "JavaScript Object Notation" },
      ],
      1600: [
        { question: "Released in 1993 by NCSA, this was the first browser to display images inline with text, making the web accessible to a general audience", answer: "Mosaic" },
        { question: "Programmers use this type of software environment to write, test, and debug code all in one place, often with syntax highlighting and version control integration", answer: "Integrated Development Environment" },
      ],
      2000: [
        { question: "Like people waiting in line at a store, this data structure processes elements in strict first-in, first-out order", answer: "Queue" },
        { question: "In Unix-like systems, this two-letter command displays the names of files and subdirectories within a given directory", answer: "ls" },
      ],
    },
  },
  {
    id: "food",
    name: "Food and Drink",
    cluesByValue: {
      400: [
        { question: "Naples, a city in this country, is widely credited as the birthplace of the modern pizza in the 18th century", answer: "Italy" },
        { question: "Tofu, tempeh, and miso all begin their lives as this legume, a staple crop of East Asian cuisine", answer: "Soybean" },
      ],
      800: [
        { question: "This French culinary phrase, meaning 'everything in its place,' refers to prepping and organizing all ingredients before you begin cooking", answer: "Mise en place" },
        { question: "Short-grained and starchy, this Italian rice variety is the traditional choice for a slow-cooked, creamy risotto", answer: "Arborio rice" },
      ],
      1200: [
        { question: "A classic mojito blends fresh lime juice, sugar, mint leaves, soda water, and this distilled sugarcane spirit", answer: "Rum" },
        { question: "This rich French emulsion sauce, made from clarified butter, egg yolks, and lemon juice, is the star of eggs Benedict", answer: "Hollandaise" },
      ],
      1600: [
        { question: "Parmigiano-Reggiano is produced exclusively in this Italian region, whose name is also associated with prosciutto di Parma", answer: "Emilia-Romagna" },
        { question: "Unlike sushi, this Japanese preparation consists of thinly sliced raw fish or seafood served without rice", answer: "Sashimi" },
      ],
      2000: [
        { question: "The sour, tangy flavor of kimchi and other fermented vegetables is produced by this process, which converts sugars into lactic acid", answer: "Lactic acid fermentation" },
        { question: "Consisting of hundreds of thin, buttery layers created by repeatedly folding dough with butter, this pastry forms the flaky base of a mille-feuille", answer: "Puff pastry" },
      ],
    },
  },
  {
    id: "mythology-r2",
    name: "Gods & Legends",
    cluesByValue: {
      400: [
        { question: "This Greek goddess of wisdom and war strategy sprang fully armored from the head of Zeus", answer: "Athena" },
        { question: "According to Greek myth, this king's golden touch brought him misery when he could no longer eat or embrace his daughter", answer: "King Midas" },
        { question: "This son of the sun god Helios drove the sun chariot and nearly scorched the Earth before Zeus struck him down with a thunderbolt", answer: "Phaethon" },
      ],
      800: [
        { question: "Janus, the Roman god of beginnings and doorways, has two faces — giving us the name of this month", answer: "January" },
        { question: "In Norse mythology, this giant wolf — bound by a magical ribbon — is prophesied to break free and swallow Odin at Ragnarök", answer: "Fenrir" },
      ],
      1200: [
        { question: "This Egyptian queen of the gods — wife of Osiris, mother of Horus — represents motherhood and magic", answer: "Isis" },
        { question: "Tantalus was condemned to stand in water beneath fruit trees but could never eat or drink; his suffering gave us this English word", answer: "Tantalize" },
      ],
      1600: [
        { question: "The hero Gilgamesh sought immortality after the death of his friend Enkidu in this ancient Mesopotamian epic, one of the oldest written works in human history", answer: "The Epic of Gilgamesh" },
        { question: "In Aztec mythology, this feathered serpent deity, whose name means 'feathered serpent,' was associated with wind, air, and learning", answer: "Quetzalcóatl" },
      ],
      2000: [
        { question: "The Valkyries of Norse mythology chose the slain warriors who would go to Valhalla versus those who went to this goddess's realm", answer: "Hel" },
        { question: "In Hindu mythology, this deity of destruction and transformation — often depicted with a third eye — also performs the Tandava cosmic dance", answer: "Shiva" },
      ],
    },
  },
  {
    id: "oscar-winners",
    name: "Oscar Winners",
    cluesByValue: {
      400: [
        { question: "This 1994 film won 13 Academy Awards including Best Picture and Best Director for James Cameron, set on a doomed ocean liner", answer: "Titanic" },
        { question: "Jodie Foster won the Best Actress Oscar twice — first for 'The Accused' and second for her role in this 1991 thriller", answer: "The Silence of the Lambs" },
        { question: "This 1982 fantasy film directed by Steven Spielberg about a boy who befriends a stranded alien won four Academy Awards", answer: "E.T. the Extra-Terrestrial" },
      ],
      800: [
        { question: "Daniel Day-Lewis holds the record for the most Best Actor Oscars, winning three times; his first was for this film about a paralyzed Irish writer", answer: "My Left Foot" },
        { question: "The first animated film ever nominated for Best Picture at the Oscars was this 1991 Disney fairy tale", answer: "Beauty and the Beast" },
      ],
      1200: [
        { question: "Hattie McDaniel became the first African American to win an Academy Award, for this 1939 epic set during the Civil War", answer: "Gone with the Wind" },
        { question: "This film swept all five top Oscar categories in 1991 — Picture, Director, Actor, Actress, and Screenplay — a feat achieved only twice before", answer: "The Silence of the Lambs" },
      ],
      1600: [
        { question: "Marlon Brando refused his Best Actor Oscar for 'The Godfather' and sent this activist to decline the award on his behalf", answer: "Sacheen Littlefeather" },
        { question: "Parasite became the first non-English-language film to win the Best Picture Oscar at the 92nd Academy Awards in 2020; it was directed by this filmmaker", answer: "Bong Joon-ho" },
      ],
      2000: [
        { question: "Peter Jackson's Lord of the Rings trilogy swept all 11 of its nominated categories for this concluding film in 2004", answer: "The Return of the King" },
        { question: "The first sound film to win Best Picture, it defeated The Jazz Singer in 1928; it was about soldiers in World War I", answer: "Wings" },
      ],
    },
  },
  {
    id: "rock-legends",
    name: "Rock Legends",
    cluesByValue: {
      400: [
        { question: "This guitarist, known for playing a left-handed Fender Stratocaster, redefined rock with 'Purple Haze' and 'Voodoo Child'", answer: "Jimi Hendrix" },
        { question: "Led Zeppelin's 'Stairway to Heaven' opens with a gentle arpeggio on this instrument before the full band enters", answer: "Acoustic guitar" },
        { question: "This British band, fronted by Mick Jagger and Keith Richards, called themselves the 'World's Greatest Rock and Roll Band'", answer: "The Rolling Stones" },
      ],
      800: [
        { question: "Nirvana's landmark 1991 album 'Nevermind,' which kicked off the grunge era, featured this lead single with its iconic distorted guitar riff", answer: "Smells Like Teen Spirit" },
        { question: "This arena rock band, featuring Freddie Mercury, is behind the anthemic songs 'We Will Rock You' and 'We Are the Champions'", answer: "Queen" },
      ],
      1200: [
        { question: "The Who's 1969 rock opera 'Tommy' told the story of a 'deaf, dumb, and blind kid' who becomes a master of this carnival game", answer: "Pinball" },
        { question: "This Irish rock band's 1987 album 'The Joshua Tree' produced the hits 'With or Without You' and 'I Still Haven't Found What I'm Looking For'", answer: "U2" },
      ],
      1600: [
        { question: "Pink Floyd's 1979 double album, one of the best-selling records ever, features the animated film directed by Alan Parker and the song 'Another Brick in the Wall'", answer: "The Wall" },
        { question: "Before going solo, this musician was the front man of the Pixies, whose stop-start 'quiet-loud' dynamic influenced Nirvana and much of 1990s alternative rock", answer: "Black Francis (Frank Black)" },
      ],
      2000: [
        { question: "The first rock and roll record is widely argued to be this 1951 song by Jackie Brenston and His Delta Cats featuring Ike Turner on piano", answer: "Rocket 88" },
        { question: "Joy Division's lead singer took his own life in 1980; the remaining members reconvened as this Manchester band, hitting the charts with 'Blue Monday'", answer: "New Order" },
      ],
    },
  },
  {
    id: "american-history",
    name: "American History",
    cluesByValue: {
      400: [
        { question: "This 1803 land deal with France roughly doubled the size of the United States for around $15 million", answer: "The Louisiana Purchase" },
        { question: "The Emancipation Proclamation freed enslaved people in states in rebellion, but the 13th Amendment to the Constitution formally abolished slavery throughout the U.S. in this year", answer: "1865" },
        { question: "This series of economic programs launched by FDR between 1933 and 1939 aimed to lift the U.S. out of the Great Depression", answer: "The New Deal" },
      ],
      800: [
        { question: "The internment of over 120,000 Japanese Americans during WWII was authorized by this executive order signed by FDR in 1942", answer: "Executive Order 9066" },
        { question: "This landmark 1954 Supreme Court case declared racial segregation in public schools unconstitutional", answer: "Brown v. Board of Education" },
      ],
      1200: [
        { question: "The Battle of Gettysburg, the bloodiest battle of the Civil War, took place over three days in this year and is considered the war's turning point", answer: "1863" },
        { question: "The first permanent English settlement in North America, established in 1607, was named for King James I of England", answer: "Jamestown" },
      ],
      1600: [
        { question: "Susan B. Anthony was arrested in 1872 for attempting to vote; she died before this constitutional amendment gave women the right to vote in 1920", answer: "The 19th Amendment" },
        { question: "Operation Overlord — the largest seaborne invasion in history — took place on the beaches of Normandy, France, on this date in 1944", answer: "June 6, 1944 (D-Day)" },
      ],
      2000: [
        { question: "The Trail of Tears refers to the forced relocation of five major Native American tribes following this 1830 federal law signed by Andrew Jackson", answer: "The Indian Removal Act" },
        { question: "This former slave and abolitionist, born Frederick Bailey, escaped slavery in 1838 and became one of the most influential voices against it", answer: "Frederick Douglass" },
      ],
    },
  },
  {
    id: "potent-potables",
    name: "Potent Potables",
    cluesByValue: {
      400: [
        { question: "This Italian liqueur made from elderflower is a key ingredient in the Aperol Spritz, served over ice with prosecco", answer: "Aperol" },
        { question: "A classic Old Fashioned is made with sugar, bitters, orange peel, a Luxardo cherry, and this spirit", answer: "Bourbon (or rye whiskey)" },
        { question: "Champagne takes its name from this region of northeastern France where the grape-growing conditions produce uniquely acidic wine", answer: "Champagne" },
      ],
      800: [
        { question: "A Negroni is a classic Italian cocktail containing equal parts gin, this red Italian bitters, and sweet vermouth", answer: "Campari" },
        { question: "This blue-agave spirit from the Jalisco region of Mexico is the base of a margarita", answer: "Tequila" },
      ],
      1200: [
        { question: "Port wine is produced in the Douro Valley of this European country and gets its name from the city of Porto", answer: "Portugal" },
        { question: "Single-malt Scotch whisky can only be called that if it's made entirely from malted barley at a single distillery in this country", answer: "Scotland" },
      ],
      1600: [
        { question: "A Moscow Mule is traditionally served in a copper mug and contains vodka, lime juice, and this spicy non-alcoholic mixer", answer: "Ginger beer" },
        { question: "This Japanese rice wine, often served warm or chilled, has been brewed for over 2,000 years and averages around 15% alcohol by volume", answer: "Sake" },
      ],
      2000: [
        { question: "Absinthe, the 'Green Fairy' popular with 19th-century Parisian artists, is flavored with wormwood and this aromatic herb", answer: "Anise" },
        { question: "This dry, amber-colored French aperitif made from wine and herbs has its headquarters in Aix-en-Provence and bears a woman's name", answer: "Lillet" },
      ],
    },
  },
  {
    id: "famous-quotes",
    name: "Famous Quotes",
    cluesByValue: {
      400: [
        { question: "This U.S. President said 'Ask not what your country can do for you — ask what you can do for your country' in his 1961 inaugural address", answer: "John F. Kennedy" },
        { question: "This civil rights leader declared 'I have a dream' during the March on Washington in 1963", answer: "Martin Luther King Jr." },
        { question: "Shakespeare's Hamlet muses 'To be, or not to be — that is the question' while contemplating this existential act", answer: "Suicide" },
      ],
      800: [
        { question: "This British wartime leader said 'Never in the field of human conflict was so much owed by so many to so few' about the RAF pilots of the Battle of Britain", answer: "Winston Churchill" },
        { question: "Marie Curie said: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear ____'", answer: "Less" },
      ],
      1200: [
        { question: "'Elementary, my dear Watson' is attributed to this fictional detective, though the exact phrase never appears in Arthur Conan Doyle's stories", answer: "Sherlock Holmes" },
        { question: "Friedrich Nietzsche wrote 'God is dead. God remains dead. And we have killed him' in this 1882 philosophical work", answer: "The Gay Science" },
      ],
      1600: [
        { question: "This Roman emperor and Stoic philosopher wrote 'You have power over your mind, not outside events. Realize this, and you will find strength' in his Meditations", answer: "Marcus Aurelius" },
        { question: "Oscar Wilde quipped 'I can resist everything except this,' according to his play Lady Windermere's Fan", answer: "Temptation" },
      ],
      2000: [
        { question: "This French philosopher and mathematician wrote 'I think, therefore I am' — cogito ergo sum — as the first principle of his Meditations on First Philosophy", answer: "René Descartes" },
        { question: "Maya Angelou wrote 'I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them ____'", answer: "Feel" },
      ],
    },
  },
  {
    id: "world-capitals",
    name: "World Capitals",
    cluesByValue: {
      400: [
        { question: "Home to Big Ben and Buckingham Palace, this city on the Thames has served as England's capital for nearly 1,000 years", answer: "London" },
        { question: "This landlocked city perched at 11,975 feet above sea level in the Andes is South America's highest national capital", answer: "Quito" },
        { question: "Despite Sydney being Australia's largest and most famous city, this planned capital has served as the seat of Australian government since 1927", answer: "Canberra" },
      ],
      800: [
        { question: "Officially named Nay Pyi Taw since 2006, Myanmar moved its capital there from this city, which remains the country's largest", answer: "Yangon" },
        { question: "This capital of Australia was purpose-built between 1908 and 1927 to settle the rivalry between Sydney and Melbourne for the honor", answer: "Canberra" },
      ],
      1200: [
        { question: "Reykjavik, the capital of Iceland, is the world's northernmost capital of a sovereign state and sits atop this geologic feature", answer: "The Mid-Atlantic Ridge" },
        { question: "Nauru, the world's smallest island nation, shares its capital's name with this English word meaning 'yard' in the Nauruan language", answer: "Yaren (de facto capital)" },
      ],
      1600: [
        { question: "Sri Lanka has two capital cities: Sri Jayawardenepura Kotte (legislative) and this largest city, its commercial and de facto administrative center", answer: "Colombo" },
        { question: "The Treaty of Westphalia in 1648 established the sovereignty of this city, which later became the capital of modern Germany", answer: "Berlin" },
      ],
      2000: [
        { question: "Kosovo's capital Pristina is home to the Bill Clinton Boulevard and a statue of this U.S. president, who is revered for the NATO intervention that ended the Kosovo War", answer: "Bill Clinton" },
        { question: "This Central Asian capital, formerly known as Frunze, was renamed after independence from the Soviet Union in 1991 and is the capital of Kyrgyzstan", answer: "Bishkek" },
      ],
    },
  },
  {
    id: "the-business-world",
    name: "The Business World",
    cluesByValue: {
      400: [
        { question: "Jeff Bezos founded this company in 1994 as an online bookstore; it is now the world's largest e-commerce platform", answer: "Amazon" },
        { question: "Warren Buffett, known as the 'Oracle of Omaha,' is CEO of this Nebraska-based holding company that owns Geico, Dairy Queen, and dozens of other brands", answer: "Berkshire Hathaway" },
        { question: "This Silicon Valley company, founded in 1998 by Larry Page and Sergey Brin, has a name that's a play on the mathematical term 'googol'", answer: "Google" },
      ],
      800: [
        { question: "Henry Ford didn't invent the automobile, but he did introduce this production method in 1913 that made cars affordable for ordinary Americans", answer: "The assembly line" },
        { question: "Elon Musk co-founded this electric vehicle company — not as a founder, but as an early investor and later CEO — named after this Serbian-American inventor", answer: "Tesla" },
      ],
      1200: [
        { question: "This company's logo — an apple with a bite taken out of it — was the subject of a decades-long trademark dispute with The Beatles' record label, which bore the same name", answer: "Apple" },
        { question: "Founded in 1955, this fast-food company's 'Golden Arches' logo is said to be the most recognized symbol in the world after the Christian cross", answer: "McDonald's" },
      ],
      1600: [
        { question: "Sam Walton opened the first store of this retail chain in Rogers, Arkansas in 1962 on the principle of offering the lowest possible prices every day", answer: "Walmart" },
        { question: "This Danish toy company, whose name means 'play well' in Danish, is the world's largest toy manufacturer by revenue", answer: "LEGO" },
      ],
      2000: [
        { question: "Though Steve Jobs is synonymous with Apple, this co-founder designed the Apple I circuit board by hand and is credited with building the first Apple computers", answer: "Steve Wozniak" },
        { question: "This Dutch company, now one of the world's largest oil companies, traces its origins to a 1907 merger between Royal Dutch Petroleum and this British Shell Transport and Trading Company", answer: "Shell" },
      ],
    },
  },
  {
    id: "nobel-prize",
    name: "Nobel Prizes",
    cluesByValue: {
      400: [
        { question: "This physicist, famous for E=mc², was awarded the Nobel Prize in Physics in 1921 for his discovery of the law of the photoelectric effect", answer: "Albert Einstein" },
        { question: "Mother Teresa received the Nobel Peace Prize in 1979 for her work with this religious order she founded to serve the poorest of the poor", answer: "The Missionaries of Charity" },
        { question: "This Polish-French physicist and chemist was the first woman to win a Nobel Prize and remains the only person to win Nobel Prizes in two different sciences", answer: "Marie Curie" },
      ],
      800: [
        { question: "This South African civil rights leader was awarded the Nobel Peace Prize in 1993 alongside F.W. de Klerk for their peaceful dismantling of apartheid", answer: "Nelson Mandela" },
        { question: "This Colombian novelist won the 1982 Nobel Prize in Literature for magical realism works including 'One Hundred Years of Solitude'", answer: "Gabriel García Márquez" },
      ],
      1200: [
        { question: "Francis Crick, James Watson, and Rosalind Franklin discovered this molecule's double-helix structure; Crick and Watson won the 1962 Nobel for it", answer: "DNA" },
        { question: "Malala Yousafzai, who survived a Taliban assassination attempt, became the youngest Nobel Peace Prize laureate in 2014 at age this", answer: "17" },
      ],
      1600: [
        { question: "The Nobel Prize was established by this Swedish chemist and engineer, who invented dynamite and left his vast fortune to fund the awards", answer: "Alfred Nobel" },
        { question: "This economist, who developed game theory, was depicted in the 2001 film 'A Beautiful Mind'; he won the Nobel Memorial Prize in Economics in 1994", answer: "John Nash" },
      ],
      2000: [
        { question: "Richard Feynman received the Nobel Prize in Physics in 1965 for his contributions to the development of this theory, describing the quantum-mechanical interaction between light and matter", answer: "Quantum electrodynamics" },
        { question: "Bob Dylan's Nobel Prize in Literature in 2016 was controversial; the Swedish Academy recognized him for creating new poetic expressions within the American this", answer: "Song tradition" },
      ],
    },
  },
  {
    id: "double-meanings",
    name: "Double Meanings",
    cluesByValue: {
      400: [
        { question: "This word can mean a sharp knock on a door OR a style of music pioneered by Grandmaster Flash and Run-DMC", answer: "Rap" },
        { question: "It can mean a coiled length of wire used in electronics, OR a long journey by boat", answer: "Reel" },
        { question: "This word describes both a baseball pitcher's strong throw AND a marketing presentation to a client", answer: "Pitch" },
      ],
      800: [
        { question: "In baseball it means a batter is out; in labor disputes it means workers walk off the job; in bowling it means knocking down all ten pins", answer: "Strike" },
        { question: "This word means both the metal fastener holding papers together AND a short video clip shown on television", answer: "Clip" },
      ],
      1200: [
        { question: "This five-letter word means both a period of hot weather AND a brief run of consecutive successes in a sport or game", answer: "Spell" },
        { question: "It can describe a military or sporting contest AND a type of lightweight, fast sailing boat — one word with nautical and competitive meanings", answer: "Race" },
      ],
      1600: [
        { question: "This word is a financial institution where you keep money AND the sloping land bordering a river", answer: "Bank" },
        { question: "It means to cook food using overhead heat in an oven, AND in informal speech, it means to face intense questioning or criticism", answer: "Broil" },
      ],
      2000: [
        { question: "This word is a type of story OR a scaly growth on a fish — homophones that are spelled differently: T-A-L-E and T-A-I-L", answer: "Tale and tail" },
        { question: "In mathematics, it describes a series that continues without end; in common usage, it means a looped ribbon symbol representing eternity", answer: "Infinity" },
      ],
    },
  },
  {
    id: "royalty",
    name: "Royalty",
    cluesByValue: {
      400: [
        { question: "Known as 'The Sun King,' this French monarch built the Palace of Versailles and ruled France for over 72 years", answer: "Louis XIV" },
        { question: "Queen Elizabeth II's reign from 1952 to 2022 made her Britain's longest-reigning monarch; her son became King with this regnal name", answer: "Charles III" },
        { question: "Cleopatra VII was the last ruler of this ancient dynasty, which ruled Egypt for nearly 300 years after Alexander the Great's death", answer: "The Ptolemaic Dynasty" },
      ],
      800: [
        { question: "Henry VIII famously broke with the Catholic Church to divorce this first of his six wives", answer: "Catherine of Aragon" },
        { question: "Victoria reigned over the British Empire from 1837 to 1901 and was grandmother to the rulers of Russia, Germany, and Spain; this era bears her name", answer: "The Victorian Era" },
      ],
      1200: [
        { question: "This Swedish-born French marshal, chosen by Napoleon as one of his generals, became King of Sweden and Norway and founded the current Swedish royal dynasty", answer: "Jean-Baptiste Bernadotte (Charles XIV John)" },
        { question: "The last Tsar of Russia, Nicholas II, and his family were executed in this Ural Mountains city by Bolsheviks in 1918", answer: "Yekaterinburg" },
      ],
      1600: [
        { question: "Japan's current imperial house is the Yamato dynasty, making it the world's oldest continuous hereditary monarchy; the current emperor holds this name", answer: "Naruhito" },
        { question: "Suleiman the Magnificent expanded the Ottoman Empire to its greatest territorial extent during his reign from 1520 to 1566; his empire's capital was this city", answer: "Constantinople (Istanbul)" },
      ],
      2000: [
        { question: "The Battle of Hastings in 1066 brought this Norman duke to power as King of England, fundamentally changing the English language by introducing French Norman words", answer: "William the Conqueror" },
        { question: "This Habsburg empress modernized Austria and is considered one of the most capable rulers of the 18th century; she was the only woman to rule the Habsburg dominions outright", answer: "Maria Theresa" },
      ],
    },
  },
  {
    id: "tv-through-decades",
    name: "TV Through the Decades",
    cluesByValue: {
      400: [
        { question: "This 1990s sitcom followed six friends — Rachel, Monica, Phoebe, Ross, Chandler, and Joey — living in New York City", answer: "Friends" },
        { question: "Lucille Ball starred in this pioneering 1950s sitcom about a wacky housewife constantly scheming to get into show business", answer: "I Love Lucy" },
        { question: "Walter White's transformation from chemistry teacher to drug kingpin unfolds across five seasons of this AMC drama", answer: "Breaking Bad" },
      ],
      800: [
        { question: "Rod Serling hosted and wrote most episodes of this anthology series that explored the uncanny and supernatural between 1959 and 1964", answer: "The Twilight Zone" },
        { question: "This HBO series, based on George R.R. Martin's novels, broke records with its Battle of the Bastards episode and its controversial final season", answer: "Game of Thrones" },
      ],
      1200: [
        { question: "Don Draper, the mysterious creative director of Sterling Cooper advertising agency, is the antihero of this AMC series set in 1960s New York", answer: "Mad Men" },
        { question: "Broadcast from 1989 to 1998, this NBC sitcom about four friends in New York was famously described as 'a show about nothing'", answer: "Seinfeld" },
      ],
      1600: [
        { question: "This British anthology series, created by Charlie Brooker, examines the dark side of technology and social media; each episode is a standalone story", answer: "Black Mirror" },
        { question: "'The Sopranos,' often called the greatest TV drama of all time, ended with this director's infamous cut-to-black in the final scene", answer: "David Chase" },
      ],
      2000: [
        { question: "The Wire, set in Baltimore and often called the greatest TV show ever made, was created by this former Baltimore Sun journalist and police reporter", answer: "David Simon" },
        { question: "This 1960s ABC series starred Adam West as a caped crusader and was famous for onscreen fight graphics like 'POW!,' 'BIFF!,' and 'ZAPP!'", answer: "Batman" },
      ],
    },
  },
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const hold = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = hold;
  }
  return next;
}

function normalizeCategoryCount(count: number | undefined, max: number): number {
  if (!count || Number.isNaN(count)) {
    return Math.min(DEFAULT_CATEGORY_COUNT, max);
  }
  return Math.max(1, Math.min(Math.floor(count), max));
}

function pickTemplate<V extends TierValue>(
  templates: ClueTemplate[],
  idsForValue: string[],
  excludedClueIds: Set<string>,
  random: () => number
): { template: ClueTemplate; optionIndex: number } {
  const availableOptionIndexes = templates
    .map((_, optionIndex) => optionIndex)
    .filter((optionIndex) => !excludedClueIds.has(idsForValue[optionIndex]));

  const pool = availableOptionIndexes.length > 0 ? availableOptionIndexes : templates.map((_, optionIndex) => optionIndex);
  const selectedOptionIndex = pool[Math.floor(random() * pool.length)];

  return {
    template: templates[selectedOptionIndex],
    optionIndex: selectedOptionIndex,
  };
}

function buildRoundCatalog<V extends TierValue>(
  round: RoundNumber,
  bank: Array<CategoryBank<V>>,
  values: V[],
  options: GenerateRoundCatalogOptions
): Category[] {
  const seed = options.seed?.trim() || `random-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const random = createRng(`round-${round}-${seed}`);
  const excludedClueIds = new Set(options.excludeClueIds || []);
  const count = normalizeCategoryCount(options.categoryCount, bank.length);
  const selectedCategories = shuffle(bank, random).slice(0, count);

  const builtCategories = selectedCategories.map((category) => {
    const clues = values.map((value) => {
      const templates = category.cluesByValue[value];
      const idsForValue = templates.map((_, optionIndex) => `r${round}-${category.id}-${value}-${optionIndex}`);
      const selection = pickTemplate(templates, idsForValue, excludedClueIds, random);

      return {
        id: `r${round}-${category.id}-${value}-${selection.optionIndex}`,
        value,
        question: selection.template.question,
        answer: selection.template.answer,
        isAnswered: false,
      };
    });

    return {
      id: `r${round}-${category.id}`,
      name: category.name,
      clues,
    };
  });

  // Pick 1 Daily Double in Round 1, 2 in Round 2, using the seeded RNG for determinism
  const ddCount = round === 1 ? 1 : 2;
  const totalClues = builtCategories.length * values.length;
  const allIndices = Array.from({ length: totalClues }, (_, i) => i);
  const ddIndices = new Set(shuffle(allIndices, random).slice(0, ddCount));

  return builtCategories.map((category, catIdx) => ({
    ...category,
    clues: category.clues.map((clue, clueIdx) => ({
      ...clue,
      isDailyDouble: ddIndices.has(catIdx * values.length + clueIdx),
    })),
  }));
}

export function generateRound1Catalog(options: GenerateRoundCatalogOptions = {}): Category[] {
  return buildRoundCatalog(1, round1Bank, ROUND_1_VALUES, options);
}

export function generateRound2Catalog(options: GenerateRoundCatalogOptions = {}): Category[] {
  return buildRoundCatalog(2, round2Bank, ROUND_2_VALUES, options);
}

export function generateGameCatalogs(options: GenerateGameCatalogsOptions = {}): {
  round1: Category[];
  round2: Category[];
} {
  const baseSeed = options.seed?.trim() || `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    round1: generateRound1Catalog({
      seed: `${baseSeed}-round1`,
      categoryCount: options.categoryCount,
      excludeClueIds: options.round1ExcludeClueIds,
    }),
    round2: generateRound2Catalog({
      seed: `${baseSeed}-round2`,
      categoryCount: options.categoryCount,
      excludeClueIds: options.round2ExcludeClueIds,
    }),
  };
}

// ─── Final Jeopardy ───────────────────────────────────────────────────────────

export interface FinalJeopardyClue {
  category: string;
  question: string;
  answer: string;
}

const finalJeopardyBank: FinalJeopardyClue[] = [
  { category: "WORLD HISTORY", question: "Signed by King John in 1215, this document was the first to establish that even a king must answer to the law", answer: "Magna Carta" },
  { category: "SCIENCE & NATURE", question: "The only metal that is liquid at standard room temperature, its chemical symbol is Hg", answer: "Mercury" },
  { category: "AMERICAN LITERATURE", question: "This Herman Melville novel opens with the line: 'Call me Ishmael'", answer: "Moby-Dick" },
  { category: "WORLD GEOGRAPHY", question: "Though Brazil's largest city is São Paulo, this city has served as its capital since 1960", answer: "Brasília" },
  { category: "THE ARTS", question: "Leonardo da Vinci painted this portrait, believed to depict Lisa Gherardini, between 1503 and 1519", answer: "The Mona Lisa" },
  { category: "U.S. PRESIDENTS", question: "He is the only U.S. president to have served two non-consecutive terms in office", answer: "Grover Cleveland" },
  { category: "ASTRONOMY", question: "At about 4.24 light-years away, this is the closest known star to our solar system", answer: "Proxima Centauri" },
  { category: "CLASSIC FILM", question: "Orson Welles directed and starred in this 1941 film, widely regarded as one of the greatest movies ever made", answer: "Citizen Kane" },
  { category: "ANCIENT HISTORY", question: "Built for Pharaoh Khufu around 2560 BC, this structure was the tallest man-made structure on Earth for over 3,800 years", answer: "The Great Pyramid of Giza" },
  { category: "MUSIC", question: "Born Robyn Fenty in Barbados, this artist became one of the best-selling music artists in history", answer: "Rihanna" },
  { category: "SHAKESPEARE", question: "This Shakespeare play contains the line 'To be, or not to be, that is the question'", answer: "Hamlet" },
  { category: "THE ANIMAL KINGDOM", question: "The only order of mammals capable of true sustained flight", answer: "Bats (order Chiroptera)" },
  { category: "WORLD LEADERS", question: "She served as Prime Minister of the United Kingdom from 1979 to 1990, the first woman to hold that office", answer: "Margaret Thatcher" },
  { category: "MATHEMATICS", question: "Named after a Greek mathematician, this theorem states that in a right triangle the square of the hypotenuse equals the sum of the squares of the other two sides", answer: "The Pythagorean theorem" },
  { category: "INVENTIONS", question: "Alexander Graham Bell is credited with patenting this invention in 1876", answer: "The telephone" },
  { category: "MYTHOLOGY", question: "In Greek mythology, this hero performed 12 labors as penance, including slaying the Nemean lion and capturing Cerberus from the underworld", answer: "Hercules (Heracles)" },
  { category: "WORLD LITERATURE", question: "Miguel de Cervantes wrote this 1605 Spanish novel, widely considered the first modern novel, about a man who believes himself to be a knight-errant", answer: "Don Quixote" },
  { category: "AMERICAN HISTORY", question: "This 1944 Supreme Court case upheld the constitutionality of Japanese American internment during World War II; it was formally overturned in 2018", answer: "Korematsu v. United States" },
  { category: "SCIENCE", question: "James Watson and Francis Crick described this molecule's double-helix structure in a 1953 paper in Nature, using X-ray data provided by Rosalind Franklin", answer: "DNA" },
  { category: "CLASSIC TELEVISION", question: "This ABC series, starring Bryan Cranston as a mild-mannered chemistry teacher who builds a drug empire, won 16 Emmy Awards including four consecutive Outstanding Drama Series", answer: "Breaking Bad" },
  { category: "SPORTS HISTORY", question: "On October 3, 1951, Bobby Thomson hit a three-run home run off Ralph Branca in the ninth inning, winning the pennant for the New York Giants; it is known as 'The Shot Heard Round the World'", answer: "The 1951 National League pennant race" },
  { category: "GEOGRAPHY", question: "Lake Baikal in Russia holds approximately 20% of the world's unfrozen surface fresh water and is the world's deepest lake, reaching this depth in feet", answer: "5,387 feet (1,642 meters)" },
  { category: "CLASSICAL MUSIC", question: "Ludwig van Beethoven composed his monumental Ninth Symphony, including the 'Ode to Joy' finale, after he had become completely this", answer: "Deaf" },
  { category: "BROADWAY", question: "This Stephen Sondheim musical, which opened on Broadway in 1979, follows the vengeful barber Sweeney Todd and his partner Mrs. Lovett in Victorian London", answer: "Sweeney Todd: The Demon Barber of Fleet Street" },
  { category: "WORLD GEOGRAPHY", question: "This African country is home to both the world's largest hot desert to the north and a tropical rainforest to the south, and is Africa's most populous nation", answer: "Nigeria" },
  { category: "PHYSICS", question: "Albert Einstein's Special Theory of Relativity, published in 1905, is summarized by the famous equation relating energy, mass, and this constant", answer: "The speed of light (E=mc²)" },
  { category: "THE PRESIDENCY", question: "Four U.S. presidents were assassinated in office: Lincoln, Garfield, McKinley, and this president, who was killed in Dallas, Texas in 1963", answer: "John F. Kennedy" },
  { category: "LITERATURE", question: "In 1851, this author wrote a letter saying his new novel would be 'a book of the horrible texture of real life'; that book was Moby-Dick", answer: "Herman Melville" },
  { category: "FILM HISTORY", question: "Gone with the Wind, still the all-time domestic box office champion when adjusted for inflation, was set primarily in this U.S. state during the Civil War", answer: "Georgia" },
  { category: "ECONOMICS", question: "Adam Smith's 1776 work laying the theoretical foundations of modern capitalism and the free market is known by this title", answer: "The Wealth of Nations" },
  { category: "WORLD HISTORY", question: "The Berlin Conference of 1884–1885 formalized the division of Africa among European powers; this process of seizing African territory for colonies became known as this", answer: "The Scramble for Africa" },
];

export function pickFinalJeopardyClue(seed: string): FinalJeopardyClue {
  const random = createRng(`fj-${seed}`);
  return finalJeopardyBank[Math.floor(random() * finalJeopardyBank.length)];
}

const defaultCatalogs = generateGameCatalogs({ seed: "default-game-seed", categoryCount: DEFAULT_CATEGORY_COUNT });

export const round1Categories: Category[] = defaultCatalogs.round1;
export const round2Categories: Category[] = defaultCatalogs.round2;

export const round1Catalog = round1Categories;
export const round2Catalog = round2Categories;