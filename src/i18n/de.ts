const de = {
  // Common
  'app.title': 'Liga Ranking',
  'common.loading': 'Laden...',
  'common.cancel': 'Abbrechen',
  'common.add': 'Hinzufügen',
  'common.remove': 'Entfernen',

  // Auth
  'auth.login': 'Anmelden',
  'auth.logout': 'Abmelden',
  'auth.signup': 'Registrieren',
  'auth.email': 'E-Mail',
  'auth.password': 'Passwort',
  'auth.signupSuccess': 'Bitte bestätige dein Konto per E-Mail.',

  // Home
  'home.greeting': 'Hallo du',
  'home.greetingUser': 'Hallo, {{email}}',

  // Countries
  'country.de': 'Deutschland',
  'country.at': 'Österreich',
  'country.ch': 'Schweiz',

  // League
  'league.addNew': '+ Neue Liga hinzufügen',
  'league.dialogTitle': 'Neue Liga — {{country}}',
  'league.name': 'Liga-Name',
  'league.namePlaceholder': 'z.B. Bundesliga',
  'league.teams': 'Mannschaften',
  'league.teamPlaceholder': 'Mannschaftsname',
  'league.noTeams': 'Noch keine Mannschaften hinzugefügt.',
  'league.create': 'Liga erstellen',
  'league.back': 'Zurück',
  'league.ranking': 'Tabelle',
  'league.edit': 'Bearbeiten',
  'league.editTitle': 'Liga bearbeiten',
  'league.save': 'Speichern',
  'league.notFound': 'Liga nicht gefunden',
  'league.stats': 'Statistik',
  'league.statsTitle': 'Aktuelle Wertung',
  'league.statsEmpty': 'Noch keine bestätigten Tipps vorhanden.',
  'league.statsVotes': 'Tipps',

  // Vote
  'vote.title': 'Deine Prognose',
  'vote.hint': 'Sortiere die Teams nach deiner Erwartung und sende deinen Tipp ab.',
  'vote.emailLabel': 'Deine E-Mail-Adresse',
  'vote.emailPlaceholder': 'mail@beispiel.at',
  'vote.submit': 'Tipp absenden',
  'vote.successTitle': 'Tipp abgeschickt!',
  'vote.successMessage': 'Bitte bestätige deinen Tipp per E-Mail. Falls du keine E-Mail erhältst, prüfe bitte deinen Spam-Ordner.',
  'vote.errorSend': 'Fehler beim Absenden. Bitte erneut versuchen.',
  'vote.errorAlreadyVoted': 'Du hast für diese Liga bereits abgestimmt.',

  // Confirm
  'confirm.loading': 'Tipp wird bestätigt...',
  'confirm.successTitle': 'Tipp bestätigt!',
  'confirm.successMessage': 'Deine Prognose wurde erfolgreich gespeichert.',
  'confirm.alreadyConfirmed': 'Dieser Tipp wurde bereits bestätigt.',
  'confirm.expired': 'Dieser Bestätigungslink ist abgelaufen.',
  'confirm.invalid': 'Ungültiger Link.',
  'confirm.ranking': 'Deine Prognose',
  'confirm.backHome': 'Zur Startseite',
} as const

export default de
