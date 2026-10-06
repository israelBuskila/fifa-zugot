import { getRoundProgress, type Match, type Player, type Session } from '@/lib/domain';

export type BanterTrigger = 'always' | 'score' | 'loss' | 'technical' | 'fastTechnical' | 'oneTechnical' | 'fourTechnicals' | 'round' | 'noRound' | 'bench' | 'promise' | 'share' | 'archive';
export interface BanterMemory {
  id: string;
  text: string;
  speaker: string;
  date: string;
  trigger: BanterTrigger;
  context: string;
}

// Short, game-related excerpts selected from the group's WhatsApp export.
// The export itself stays outside the application and is never sent to the AI model.
export const banterMemories: readonly BanterMemory[] = [
  {id:'facts',text:'אפשר לעקוץ עם עובדות',speaker:'גלעד',date:'19.9.2025',trigger:'always',context:'כשצריך לפתוח את הראיות במקום להכריע לפי דיבורים'},
  {id:'case-closed',text:'עד כאן העובדות',speaker:'יעקב',date:'30.12.2025',trigger:'always',context:'אחרי תוצאה או נתון שלא צריך להתווכח עליו'},
  {id:'talk-vs-play',text:'דיבורים לחוד ומעשים לחוד',speaker:'נדב',date:'30.12.2025',trigger:'promise',context:'אחרי משפט או הבטחה שנשמרו לפני המשחק'},
  {id:'how-many',text:'מלא טכני- זה אומר 1',speaker:'יעקב',date:'30.12.2025',trigger:'oneTechnical',context:'כשנספר טכני בודד בערב'},
  {id:'fastest',text:'אני דורש תואר ״עשה טכני בזמן הקצר ביותר״',speaker:'ישראל',date:'28.12.2025',trigger:'fastTechnical',context:'לטכני שדקת המשחק שלו תועדה'},
  {id:'no-round',text:'יש פה מישהו בלי סבב?',speaker:'גלעד',date:'1.7.2026',trigger:'noRound',context:'אחרי כמה משחקים, כשיש שחקנים שעוד לא השלימו סבב'},
  {id:'stories',text:'תמשיך לספר סיפורים',speaker:'יעקב',date:'4.5.2026',trigger:'noRound',context:'כשהטענה על הסבב אינה מופיעה בתוצאות'},
  {id:'streak-first',text:'אחלה קודם תצבור רצף',speaker:'גלעד',date:'4.5.2026',trigger:'round',context:'כשיש רצף בדרך לסבב, אבל עוד נשארו יריבים'},
  {id:'rider',text:'מרכיב או רוכב?',speaker:'גלעד',date:'15.10.2025',trigger:'round',context:'כשלזוג יש רצף ויש ויכוח על חלקו של כל שותף'},
  {id:'loser-title',text:'בר הפסידא',speaker:'ישראל',date:'9.9.2026',trigger:'technical',context:'כינוי רגעי אחרי הפסד טכני, לא תואר קבוע של אדם'},
  {id:'bench',text:'תביאו עוד פרנג׳ס',speaker:'גלעד',date:'20.10.2025',trigger:'bench',context:'כשיש שחקן שמחכה בספסל'},
  {id:'what-happened',text:'מי הפסיד וכמה',speaker:'נתי',date:'30.12.2025',trigger:'always',context:'למי שלא היה בערב ורוצה את הסיפור בקצרה'},
  {id:'yellow-cards',text:'אני מתחיל להוציא צהובים',speaker:'גלעד',date:'29.10.2025',trigger:'bench',context:'שפת ועדת המשמעת של החבורה; בהומור בלבד'},
  {id:'share',text:'המעריצים מתגעגעים…',speaker:'ישראל',date:'8.9.2025',trigger:'share',context:'לכרטיס תוצאה שנבחר לשיתוף'},
  {id:'league',text:'מתי תפנימו של זה לא רק נבחרת זה הליגה',speaker:'נתי',date:'15.10.2025',trigger:'archive',context:'שפת הליגה של החבורה'},
  {id:'last-arrives',text:'לא הבנתי איך הגענו למצב שמי שמאחר בא בדרישות',speaker:'יעקב',date:'19.10.2025',trigger:'archive',context:'הסאגה החוזרת סביב זמני ההגעה'},
  {id:'manager',text:'יעקב אני מנהל הקבוצה',speaker:'גלעד',date:'19.10.2025',trigger:'archive',context:'תפקיד המנהל שגלעד אימץ בצ׳אט'},
  {id:'discipline',text:'אם אתה מדבר ככה לרבייני אתה תעלה ועדת משמעת',speaker:'גלעד',date:'19.10.2025',trigger:'archive',context:'הוועדה המדומיינת של הקבוצה'},
  {id:'ego',text:'מה שווה הישיבה בלעדיי?',speaker:'ישראל',date:'20.10.2025',trigger:'archive',context:'תשובה טיפוסית לפני הגעה לערב'},
  {id:'bench-ready',text:'נתי תעמיד בכוננות את הפרנג׳סים',speaker:'גלעד',date:'25.10.2025',trigger:'bench',context:'כשיש שחקני ספסל בהמתנה'},
  {id:'bench-chant',text:'או אה יש גם פרנגס',speaker:'יעקב',date:'26.10.2025',trigger:'bench',context:'תגובה לשחקן נוסף מחוץ להרכב'},
  {id:'bad-service',text:'עזבו יש לי הרבה ביקורת',speaker:'נדב',date:'29.10.2025',trigger:'archive',context:'פתיח קצר למונולוג על ארגון הערב'},
  {id:'heated',text:'המשחקים יהיו מענינים יותר',speaker:'גלעד',date:'29.10.2025',trigger:'archive',context:'אחרי שהשיחה התחממה לפני המשחק'},
  {id:'five-yellows',text:'חמש כרטיסים צהובים הרחקה מערב פיפ״א',speaker:'גלעד',date:'29.10.2025',trigger:'archive',context:'סעיף מתוך תקנון ועדת המשמעת הבדיונית'},
  {id:'red-card',text:'כרטיס אדום הרחקה מיידית וועדת משמעת בראשת שאר החברים',speaker:'גלעד',date:'29.10.2025',trigger:'archive',context:'המשך התקנון הבדיוני'},
  {id:'pizza-exemption',text:'ישראל אתה פטור מתשלום אכלת מספיק בורקס גבינה',speaker:'גלעד',date:'21.10.2025',trigger:'archive',context:'בדיחה על חשבון הפיצה; לא מדד טכני'},
  {id:'pizza-debt',text:'בן אדם אומר שהוא לא בפיצה וזה רק אחרי ששאלו אותו',speaker:'גלעד',date:'29.10.2025',trigger:'archive',context:'עוד הודעת הנהלה על הפיצה'},
  {id:'to-app',text:'לא , הבן אדם שבנה את האפליקציה קרס',speaker:'גלעד',date:'30.12.2025',trigger:'archive',context:'עקיצה על האפליקציה, לא הודעת שגיאה'},
  {id:'rounds-yesterday',text:'תזכיר לי כמה סבבים של ניצחונות היה לך אתמול',speaker:'נדב',date:'30.12.2025',trigger:'noRound',context:'כשפותחים את סיכום הסבבים'},
  {id:'who-scored',text:'מי עשה תגול זאת השאלה רבייני',speaker:'נתי',date:'30.12.2025',trigger:'archive',context:'כשמתווכחים על גול; אין תמיד רישום כובש'},
  {id:'regular-goal',text:'האמת לא הבנתי את ההתלהבות, גול רגיל',speaker:'יעקב',date:'30.12.2025',trigger:'archive',context:'תגובה יבשה לסרטון שער'},
  {id:'what-a-goal',text:'וואו איזה גול שמתי אתמול',speaker:'יעקב',date:'30.12.2025',trigger:'archive',context:'הצד השני של אותו ויכוח על השער'},
  {id:'missed-chaos',text:'נראה לי הפסדתי ערב של בלאגן',speaker:'נתי',date:'30.12.2025',trigger:'archive',context:'למי שלא היה כשכולם התחילו להתווכח'},
  {id:'technical-worthy',text:'אין הרבה טכני, זה חייב להיות משהו ששווה להילחם עליו',speaker:'יעקב',date:'31.12.2025',trigger:'technical',context:'השיחה על הערך של טכני'},
  {id:'technical-silence',text:'נהוג שמי שמקבל טכני יחידים גוזר על עצמו שתיקה',speaker:'גלעד',date:'30.12.2025',trigger:'archive',context:'כלל בדיחה על משחקי יחידים, לא כלל אפליקציה'},
  {id:'technical-effect',text:'מה עם טכני אפקט',speaker:'גלעד',date:'15.12.2025',trigger:'technical',context:'דרישה שחזרה סביב הטכני'},
  {id:'who-got-three',text:'מי לדעתך קיבל 3:0?',speaker:'ישראל',date:'30.12.2025',trigger:'technical',context:'שאלה על תוצאה טכנית'},
  {id:'score-camera',text:'כלומר אני מצלם מסך סוף משחק הai לוקח ומזין את התוצאה',speaker:'גלעד',date:'1.12.2025',trigger:'archive',context:'רעיון ישן להזנת תוצאה מצילום, לא פיצ׳ר קיים'},
  {id:'only-one',text:'בסך הכל עשית סבב אחד אתמול',speaker:'גלעד',date:'4.5.2026',trigger:'round',context:'תגובה שמחזירה את הדיון למספר הסבבים'},
  {id:'could-not-one',text:'אתה מבין, את הבסך הכל הזה לא הצלחת לעשות',speaker:'יעקב',date:'4.5.2026',trigger:'noRound',context:'תשובה ל״בסך הכל סבב אחד״'},
  {id:'two-weeks',text:'שבועים זה ביצה',speaker:'גלעד',date:'4.5.2026',trigger:'archive',context:'ערעור על מדגם קצר של שבועיים'},
  {id:'personal-coach',text:'ממליץ לך לקחת מאמן אישי בפגרה',speaker:'יעקב',date:'4.5.2026',trigger:'noRound',context:'כששואלים איך לשבור תקופה בלי סבב'},
  {id:'photoshop',text:'נראה פוטושופ',speaker:'גלעד',date:'4.5.2026',trigger:'archive',context:'תגובה לתמונה שהוצגה כהוכחה'},
  {id:'whistle',text:'תפסיק לשרוק כשאתה מוסר לי עקב, זה גומר אותי',speaker:'יעקב',date:'4.5.2026',trigger:'archive',context:'רגע מהמשחק שדורש היכרות עם החיקוי'},
  {id:'keyboard',text:'זה בן אדם שהיה דקה 80 בודק מקשים בפיפא',speaker:'גלעד',date:'22.3.2026',trigger:'archive',context:'סיפור על תירוץ המקשים'},
  {id:'pay-if-no-round',text:'כל מי שאין לו סבב שיעביר לי 30',speaker:'יעקב',date:'24.4.2026',trigger:'noRound',context:'בדיחה שמחברת חשבון פיצה וסבבים, לא חיוב אמיתי'},
  {id:'bench-contest',text:'מה אנשים עושים כדי לזכות בתחרות פרנגס המצחיק',speaker:'גלעד',date:'1.6.2026',trigger:'bench',context:'כשהפרנג׳ס גונב את ההצגה'},
  {id:'app-works',text:'אז אני מתחייב לבוא עם אפליקציה עובדת',speaker:'יעקב',date:'15.6.2026',trigger:'archive',context:'הבטחה היסטורית על האפליקציה'},
  {id:'only-lost',text:'אחי רק הפסדת',speaker:'גלעד',date:'25.6.2026',trigger:'loss',context:'כשתוצאות הערב כוללות הפסדים'},
  {id:'missing-three',text:'יש פה מישהו בלי 3, שישתוק לאיזה שעה',speaker:'יעקב',date:'1.7.2026',trigger:'technical',context:'שפת טכני של החבורה, לא השתקה באפליקציה'},
  {id:'app-rival',text:'אני רק אגיד שאם האפליקציה לא מספיק טובה אנחנו נרים אפליקציה מתחרה',speaker:'ישראל',date:'2.7.2026',trigger:'archive',context:'עקיצה על יציבות האפליקציה'},
  {id:'four-technical',text:'איפה ה4 טכני שלי',speaker:'ישראל',date:'2.7.2026',trigger:'fourTechnicals',context:'כשנרשמו לפחות ארבעה טכני בערב'},
  {id:'no-poster',text:'אם אין פוסטר אין משחק',speaker:'יעקב',date:'19.7.2026',trigger:'share',context:'כשמכינים פוסטר לשיתוף'},
  {id:'phone-bench',text:'מקסימום תעלה פרנג׳ס טלפוני',speaker:'גלעד',date:'22.4.2026',trigger:'bench',context:'הפרנג׳ס שלא נמצא פיזית במשחק'},
  {id:'bench-comedian',text:'נחמד תמיד לשחק שיש פרנגס שמספר לנו בדיחות',speaker:'גלעד',date:'22.4.2026',trigger:'bench',context:'תפקיד הפרנג׳ס כמספר בדיחות'},
  {id:'all-winners',text:'תמיד יש צמד שמנצח',speaker:'גלעד',date:'27.7.2026',trigger:'round',context:'בתגובה לרעיון שאותו צמד יישאר לשחק'},
  {id:'grips',text:'זה גריפס אוף זה גריפס !!',speaker:'גלעד',date:'27.7.2026',trigger:'archive',context:'בדיחה עם ביצוע קולי שלא הופיע בייצוא'},
  {id:'one-round',text:'שמה יש לי באמת 0',speaker:'נתי',date:'2.7.2026',trigger:'noRound',context:'הומור עצמי אחרי בקשה להוסיף סבבים לאפליקציה'},
  {id:'add-rounds',text:'תכניס סבבים גם אם אתה יכול',speaker:'נתי',date:'2.7.2026',trigger:'archive',context:'הבקשה של נתי שנענתה בקוד'},
  {id:'almost-round',text:'תנחש למי כמעט היה סבב ואיכשהו זה חמק ברגע האחרון',speaker:'יעקב',date:'9.9.2026',trigger:'noRound',context:'כשיש רצף שנקטע לפני השלמה'},
  {id:'birthday-round',text:'נתנתו לו בגלל היום הולדת',speaker:'גלעד',date:'9.9.2026',trigger:'archive',context:'עקיצה על סבבים בערב יום הולדת מסוים'},
  {id:'technical-pun-one',text:'בר הפסידא נכנס לחדר …והניצחון שוב ביקש דחיה',speaker:'גלעד',date:'9.9.2026',trigger:'loss',context:'המשך משחק המילים על בר הפסידא'},
  {id:'technical-pun-two',text:'בר הפסידא לא הפסיד טכנית הטכניקה הפסידה אותו.',speaker:'גלעד',date:'9.9.2026',trigger:'technical',context:'בדיחה על הפסד טכני'},
  {id:'full-of-rounds',text:'שנה טובה מלאה בסבבים',speaker:'גלעד',date:'11.9.2026',trigger:'archive',context:'איחול חגיגי בשפת הקבוצה'},
  {id:'app-beta',text:'יש אפליקציה גרסת בטא',speaker:'יעקב',date:'24.9.2026',trigger:'archive',context:'עוד בדיחה על גרסאות האפליקציה'},
  {id:'ask-belesh',text:'תשאל את בלש אם יש לו סבב, זה יסכם לך דיי טוב',speaker:'יעקב',date:'25.9.2026',trigger:'archive',context:'עקיצה על סבב של אדם מסוים בערב עבר'},
  {id:'missing-host',text:'לא נרשמו הפעלות ומשחקי חברה במהלך הערב, הפרנצ׳ס היה חסר',speaker:'יעקב',date:'25.9.2026',trigger:'archive',context:'כשלא היה פרנג׳ס בערב עבר'},
  {id:'blame-partner',text:'יעקב שוב הפסיד בכוונה שלא יהיה לי סבב',speaker:'נדב',date:'25.9.2026',trigger:'archive',context:'טענה של שחקן, לא עובדה שהמערכת יכולה להוכיח'},
  {id:'practice',text:'לפי איך שאתה משחק אני די מבין למה אין לך חשק לבוא',speaker:'ישראל',date:'2.10.2026',trigger:'archive',context:'עקיצה על ביטול הגעה לערב'},
  {id:'all-losses',text:'אני זוכר שהוא רק הפסיד 🤣',speaker:'גלעד',date:'2.10.2026',trigger:'archive',context:'זיכרון סובייקטיבי מהצ׳אט, לא סטטיסטיקה'},
  {id:'keyboard-delay',text:'אתה שוכח כמה זמן לוקח לך לסדר את המקשים',speaker:'נדב',date:'3.10.2026',trigger:'archive',context:'בדיחת המקשים החוזרת'},
  {id:'pastry-full',text:'אך שבע מבורקסים',speaker:'יעקב',date:'4.10.2026',trigger:'technical',context:'בורקס בשפת הקבוצה הוא טכני שקיבלת'},
  {id:'pastry-count',text:'מה עם בורקסים שחולקו במהלך  הערב',speaker:'גלעד',date:'4.10.2026',trigger:'technical',context:'בקשה להצגת הבורקסים בסטטיסטיקות'},
  {id:'always-first',text:'מעניין שתמיד אתה מקום ראשון איכשהו',speaker:'ישראל',date:'4.10.2026',trigger:'archive',context:'עקיצה על טבלת הדירוג; צריך להציג נוסחה שקופה'},
  {id:'legendary-night',text:'יהיה ערב פיפא לפנתיאון היום',speaker:'יעקב',date:'16.4.2026',trigger:'promise',context:'הבטחה חגיגית לפני ערב פיפא'},
] as const;

export interface SuggestedMemory { memory: BanterMemory; reason: string }

export function suggestBanterMemories(session: Session, match?: Match): SuggestedMemory[] {
  const currentRound = getRoundProgress(session.matches);
  const result = match ?? session.matches.at(-1);
  const currentIsTechnical = (session.scoreA === 3 && session.scoreB === 0) || (session.scoreA === 0 && session.scoreB === 3);
  const technical = currentIsTechnical || result?.resultType === 'technical';
  const technicalMinute = result?.resultType === 'technical' ? result.technicalMinute : undefined;
  const technicalCount = session.matches.filter(item => item.resultType === 'technical').length;
  const matchNumber = match?.sequenceNumber ?? session.matches.length + 1;
  const quoteForMatch = session.quotes?.some(quote => quote.matchNumber === matchNumber) ?? false;
  const hasNoRound = session.matches.length >= 3 && session.playerIds.some(id => !currentRound.completed.some(round => round.pair.includes(id)));
  const latestRound = result ? currentRound.completed.some(round => round.matchId === result.id) : false;

  const matches = (memory: BanterMemory): string | null => {
    switch (memory.trigger) {
      case 'technical': return technical ? 'יש טכני בתוצאה' : null;
      case 'fastTechnical': return technicalMinute !== undefined ? `הטכני נרשם בדקה ${technicalMinute}` : null;
      case 'oneTechnical': return technicalCount === 1 ? 'נרשם טכני אחד בערב' : null;
      case 'fourTechnicals': return technicalCount >= 4 ? 'נרשמו לפחות ארבעה טכני בערב' : null;
      case 'round': return latestRound || currentRound.beaten > 0 ? 'יש רצף או סבב בתוצאות' : null;
      case 'noRound': return hasNoRound ? 'יש שחקנים שעדיין לא השלימו סבב' : null;
      case 'bench': return session.lineup.bench.length > 0 ? 'יש פרנג׳ס על הספסל' : null;
      case 'promise': return quoteForMatch ? 'נשמר משפט למשחק הזה' : null;
      case 'score': return result ? 'יש תוצאה למשחק' : null;
      case 'loss': return result?.winner ? 'יש מנצח ומפסיד במשחק האחרון' : null;
      case 'share':
      case 'archive': return null;
      case 'always': return 'משפט פתיחה מהארכיון';
    }
  };

  const priority: Record<BanterTrigger, number> = {always:1,score:2,loss:3,technical:4,fastTechnical:6,oneTechnical:5,fourTechnicals:6,round:4,noRound:4,bench:2,promise:5,share:0,archive:0};
  const weighted = banterMemories.flatMap(memory => {
    const reason = matches(memory);
    return reason ? [{memory,reason,priority:priority[memory.trigger]}] : [];
  });
  const byTrigger = new Map<BanterTrigger, typeof weighted>();
  for (const item of weighted) byTrigger.set(item.memory.trigger,[...(byTrigger.get(item.memory.trigger)??[]),item]);
  const choices = [...byTrigger.entries()].map(([trigger,items]) => {
    const offset = session.matches.length + (match?.sequenceNumber ?? 0);
    return {trigger,item:items[offset % items.length]};
  });
  return choices.sort((a,b) => b.item.priority - a.item.priority).slice(0,4).map(({item}) => ({memory:item.memory,reason:item.reason}));
}

export function groupVoiceNotes(players: Player[]): string[] {
  const present = new Set(players.map(player => `${player.name} ${player.nickname ?? ''}`));
  const has = (part: string) => [...present].some(name => name.includes(part));
  return [
    has('גלעד') ? 'גלעד נוטה להודעות הנהלה ותקנון משועשע.' : null,
    has('יעקב') ? 'יעקב נוטה להציג תוצאות כראיות ולסיים במשפט יבש.' : null,
    has('ישראל') ? 'ישראל מחזיר עקיצה ומבקש קרדיט על טכני ושיאים.' : null,
    has('נדב') || has('בלש') ? 'נדב מעדיף משפט קצר שמעמיד דיבורים מול מעשים.' : null,
    has('נתי') ? 'נתי שואל מה הפסיד וכמה, וגם צוחק על עצמו.' : null,
  ].filter((note): note is string => Boolean(note));
}
