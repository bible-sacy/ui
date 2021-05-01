# Interface commune aux livres exposées sur sacy.be

## Utilisation

- Cloner dans le dossier `ui` de la racin du site le présent dépôt.

- Ajouter `<link rel="stylesheet" type="text/css" href="ui/css/ui.css">` au nœud `head` de l’index du site.

- Configurer suivant cet exemple le nœud `body` de l’index du site qui souhaite utiliser cette interface, en modifiant à volonté les constantes `sites` et `UI_ENV` :

```html
<body>
    <div id="uiContainer"></div>
    <script>
        const sites = [
            {
                title: 'Bible de Sacy',
                url: 'https://bible.sacy.be'
            },
            {
                title: 'Heures de Port-Royal',
                url: 'https://heures.sacy.be'
            },
            {
                title: 'Bible de Royaumont',
                url: 'https://royaumont.sacy.be'
            }
        ]
        
        const UI_ENV = {
            title: 'Heures de Port-Royal',
            canonical: 'https://heures.sacy.be',
            dataBasePath:'',
            uiPath: 'ui',
            bookSelectorLabel: 'Éd.',
            chapterSelectorLabel: 'Part.',
            sites,
            links: [
                {
                    title: 'rapporter une erreur',
                    url: 'https://github.com/heures-port-royal/heures-port-royal.github.io/issues'
                },
                {
                    title: 'code source du site web',
                    url: 'https://github.com/heures-port-royal/heures-port-royal.github.io'
                },
                {
                    title: 'autres œuvres de Port-Royal',
                    url: 'https://www.sacy.be'
                }
            ]
        }
    </script>
    <!-- for dev -->
    <!-- <script src="vue.js"></script><script src="vuex.js"></script> -->
    <!-- end: for dev -->
    <!-- for production -->
    <script src="ui/js/lib/vue.min.js"></script><script src="ui/js/lib/vuex.min.js"></script>
    <!-- end: for production -->
    <script src="ui/js/lib/hammer.min.js"></script>
    <script src="ui/js/ui.js"></script>
    <script>ui_init(UI_ENV)</script>
    <script src="ui/js/lib/darkmode-js.min.js"></script>
    <script src="ui/js/darkmode.js"></script>
</body>
```

## Conditions d’utilisation

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Licence Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />Le code html, javascript (sauf mention contraire pour les bibliothèques de `js/lib`) et les données JSON sont mis à disposition selon les termes de la <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Licence Creative Commons Attribution -  Partage dans les Mêmes Conditions 4.0 International</a>.
