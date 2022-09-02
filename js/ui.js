const ui_init = (UI_ENV) => {

/**
 * From https://github.com/github/fetch/pull/92#issuecomment-174730593
 * @param {*} url 
 * @returns 
 */
function fetchXHR(url) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest
        xhr.onload = function() {
            resolve(new Response(xhr.responseText, {status: xhr.status}))
        }
        xhr.onerror = function() {
            reject(new TypeError('Local request failed'))
        }
        xhr.open('GET', url)
        xhr.send(null)
    })
}

/**
 * Title of the document.
 */
const DOCUMENT_TITLE = UI_ENV.title

/**
 * Canonical URL of the document.
 */
const CANONICAL = UI_ENV.canonical

/**
 * Where to fetch the data.
 */
const BASE = UI_ENV.dataBasePath

/**
 * Where to fetch the pdf documents.
 */
const PDFS_BASE = `${BASE}pdfs`

/**
 * What text to display at the bottom of the pages.
 */
const FOOTER_TEXT = UI_ENV.footerText || "Digitized by Google"

/**
 * What link to display at the bottom of the pages.
 */
const FOOTER_LINK_LABEL = UI_ENV.footerLinkLabel || "Autres livres de Port-Royal"
const FOOTER_LINK = UI_ENV.footerLink || "https://www.sacy.be"

/**
 * How page numbers are written.
 */
const NUMBER_FORMAT = UI_ENV.numberFormat || (n => n)

/**
 * Node in the head section: <link id="canonical" rel="canonical" href="…" />
 */
const CANONICAL_NODE = document.getElementById("canonical")

/**
 * Shortcuts documentation data, shown on the "info" div.
 */
const shortcuts = [
    {
        key: '→|a',
        str: 'page suivante'
    },
    {
        key: '←|r',
        str: 'page précédente'
    },
    {
        key: 'v',
        str: 'basculer de mode d’affichage'
    },
    {
        key: '+',
        str: 'agrandir l’image'
    },
    {
        key: '-',
        str: 'rétrécir l’image'
    },
    {
        key: 'p',
        str: 'choisir la page'
    },
    {
        key: 'c',
        str: 'choisir le chapitre'
    },
    {
        key: 'l',
        str: 'choisir le livre'
    },
    {
        key: 's',
        str: 'choisir le site'
    },
    {
        key: 'o|t',
        str: 'dupliquer l’onglet'
    },
    {
        key: 'q',
        str: 'fermer l’onglet'
    },
    {
        key: 'i',
        str: 'cacher ou afficher ces informations'
    },
    {
        key: 'n',
        str: 'cacher ou afficher la barre de navigation'
    }
]

/**
 * Initial state for Vuex.
 */
const state = {
    loading: true,
    showInfo: false,
    showNavBar: true,
    displayMode : 'onePage', // 'onePage' or 'twoPages'
    indexData: null, // content of index.json
    currentBook: null,
    bookData: null,  // content of <currentBook>.json
    currentPage: null,
    zoom: 100, // pourcent
}

/**
 * Browser local storage to recorde the ui settings (zoom, displayMode…)
 */
const myStorage = window.localStorage;

/**
 * Mutations for Vuex.
 */
const mutations = {
    /**
     * Set the initial state.
     */
    init (state, {indexData, currentBook, bookData, currentPage}) {
        state.indexData = indexData
        state.bookData = bookData
        state.currentBook = currentBook
        state.currentPage = currentPage
        state.loading = false
        const displayMode = myStorage.getItem('displayMode')
        if (displayMode === 'onePage' || displayMode === 'twoPages')
            state.displayMode = displayMode
        const z = myStorage.getItem('zoom')
        if (z) {
            zoom = parseInt(z)
            if (zoom && zoom > 10 && zoom < 300)
                state.zoom = zoom
        }
    },
    /**
     * Show or hide the info section.
     */
    toggleInfo (state) {
        state.showInfo = !state.showInfo
    },
    /**
     * Show or hide the navigation bar.
     */
    toggleNavBar (state) {
        state.showNavBar = !state.showNavBar
    },
    /**
     * Display with one or two pages.
     */
    toggleDisplayMode (state) {
        state.displayMode = state.displayMode === 'onePage' ? 'twoPages' : 'onePage'
        myStorage.setItem('displayMode', state.displayMode)
    },
    /**
     * Go to the given page of the same book.
     */
    changePageInSameBook (state, page) {
        if (page >= state.bookData.min && page <= state.bookData.max) {
            state.currentPage = page
        } else {
            console.warn("changePageInSameBook: page ", page, "is not valid.")
        }
    },
    /**
     * Go to a different book.
     */
    loadNewBook (state, {currentBook, bookData, currentPage}) {
        state.bookData = bookData
        state.currentBook = currentBook
        state.currentPage = currentPage
    },
    /**
     * Increases the page size.
     */
    incrZoom (state) {
        state.zoom = state.zoom + 5
        myStorage.setItem('zoom', state.zoom)
    },
    /**
     * Decreases the page size.
     */
    decrZoom (state) {
        state.zoom = state.zoom - 5
        myStorage.setItem('zoom', state.zoom)
    }
}

/**
 * If the argument is a number, returns
 * it with roman figures.
 * Else, returns the input.
 */
const convertToRoman = (num) => {
    if (!Number.isInteger(num)) return num
    var roman = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1
    };
    var str = '';
  
    for (var i of Object.keys(roman)) {
      var q = Math.floor(num / roman[i]);
      num -= q * roman[i];
      str += i.repeat(q);
    }
  
    return str;
}

/**
 * Getters for Vuex.
 */
const getters  = {

    minPage (state) {
        if (state.bookData) {
            return state.bookData.min
        }
        else
            return null
    },

    maxPage (state) {
        if (state.bookData)
            return state.bookData.max
        else
            return null
    },

    /**
     * Returns the odd (right) page number that should
     * be displayed when displayMode is "twoPages".
     * If it does not exist, returns null.
     */
    pageImpaire (state) {
        if (state.loading) return null
        const page = state.currentPage
        const pageImpaire = ((page % 2) == 0) ? page + 1 : page
        if (pageImpaire >= state.bookData.min && pageImpaire <= state.bookData.max)
            return pageImpaire
        else
            return null
    },
    /**
     * Returns the even (left) page number that should
     * be displayed when displayMode is "twoPages".
     * If it does not exist, returns null.
     */
    pagePaire (state) {
        if (state.loading) return null
        const page = state.currentPage
        const pagePaire = ((page % 2) == 0) ? page : page - 1
        if (pagePaire >= state.bookData.min && pagePaire <= state.bookData.max)
            return pagePaire
        else
            return null
    },
    /**
     * Returns the next page, or null.
     */
    nextPage (state, getters) {
        if (state.loading) return null
        var nextPage = state.currentPage + 1
        if (state.displayMode === 'twoPages') {
            if (getters.pageImpaire === null) {
                nextPage = getters.pagePaire + 1
            } else {
                nextPage = getters.pageImpaire + 1
            }
        }
        if (nextPage >= state.bookData.min && nextPage <= state.bookData.max)
            return nextPage
        else
            return null
    },
    /**
     * Returns the previous page, or null.
     */
    previousPage (state, getters) {
        if (state.loading) return null
        var previousPage = state.currentPage - 1
        if (state.displayMode === 'twoPages') {
            if (getters.pagePaire === null) {
                previousPage = getters.pageImpaire - 1
            } else {
                previousPage = getters.pagePaire - 1
            }
        }
        if (previousPage >= state.bookData.min && previousPage <= state.bookData.max)
            return previousPage
        else
            return null
    },
    /**
     * Returns the img src from the state and the image number.
     */
    imgSrc (state) {
        return (number) => {
            if (state.loading) return null
            const folder = state.bookData.folder
            const n = NUMBER_FORMAT(number)
            if (folder.match('/')) {
                const [suffix, f] = folder.split('/', 2)
                return `${BASE}pngs${suffix}/${f}/${f}-${n}.png`
            } else {
                return `${BASE}pngs/${folder}/${folder}-${n}.png`
            }
        }
    },
    /**
     * Returns the CSS style to apply to the img node(s)
     * displaying the page(s).
     */
    pageStyle (state) {
        if (state.loading) return ""
        return `width: ${50 * state.zoom / 100}em`
    },
    pageImpaireStyle (state, getters) {
        if (state.loading) return ""
        if (getters.pageImpaire === null)
            return `width: ${50 * state.zoom / 100}em; visibility: hidden;`
        else
            return `width: ${50 * state.zoom / 100}em;`
    },
    pagePaireStyle (state, getters) {
        if (state.loading) return ""
        if (getters.pagePaire === null)
            return `width: ${50 * state.zoom / 100}em; visibility: hidden;`
        else
            return `width: ${50 * state.zoom / 100}em;`
    },
    /**
     * The list of links as { title, url } to display in the info div.
     */
    links () {
        return UI_ENV.links
    },
    /**
     * The canonical base url.
     */
    canonical () {
        return CANONICAL
    },
    /**
     * The footer text.
     */
    footerText () {
        return FOOTER_TEXT
    },
    /**
     * The footer link href.
     */
    footerLink () {
        return FOOTER_LINK
    },
    /**
     * The footer link text.
     */
    footerLinkLabel () {
        return FOOTER_LINK_LABEL
    },
    /**
     * The list of sites as { title, url } to show in the selector.
     */
    sites () {
        return UI_ENV.sites
    },
    /**
     * The label of the "books" select input.
     */
    bookSelectorLabel () {
        return UI_ENV.bookSelectorLabel
    },
    /**
     * The label of the "chapters" select input.
     */
    chapterSelectorLabel () {
        return UI_ENV.chapterSelectorLabel
    },
    /**
     * Display name of the current book.
     */
    currentBookDisplayName (state) {
        if (state.loading) return null
        return state.indexData.books.filter(b => b[0] == state.currentBook)[0][1]
    },
    /**
     * The list of books as { key, label }.
     */
    books (state) {
        if (state.loading) return null
        return state.indexData.books.map(a => { return {
            key: a[0],
            label: a[1]
        }})
    },
    /**
     * Returns the book key before the one with the given key,
     * or null if it is the first book.
     */
    previousBookOfKey (state) {
        return (key) => {
            if (state.loading) return null
            const idx = state.indexData.books.findIndex(a => a[0] == key)
            if (idx - 1 >= 0)
                return state.indexData.books[idx - 1][0]
            else
                return null
        }
    },
    /**
     * Returns the key of the previous book, or null.
     */
    previousBook (state, getters) {
        return getters.previousBookOfKey(state.currentBook)
    },
    /**
     * Returns the book key after the one with the given key,
     * or null if it is the last book.
     */
    nextBookOfKey (state) {
        return (key) => {
            if (state.loading) return null
            const idx = state.indexData.books.findIndex(a => a[0] == key)
            if (idx + 1 < state.indexData.books.length)
                return state.indexData.books[idx + 1][0]
            else
                return null
        }
    },
    /**
     * Returns the key of the next book, or null.
     */
    nextBook (state, getters) {
        return getters.nextBookOfKey(state.currentBook)
    },
    /**
     * The list of chapters of the current book as
     *   { title, page, last, roman, key },
     * where:
     * "title" is the name,
     * "roman" the name in roman figures, if it is a number,
     * "page" is the first page,
     * "last" is the last page,
     * "key" is "title-page"
     */
    chapters (state) {
        if (state.loading) return null
        let l = []
        for (let i = 0; i < state.bookData.chapters.length; ++i) {
            const c = state.bookData.chapters[i]
            let last = state.bookData.max
            if (i < state.bookData.chapters.length - 1)
                last = state.bookData.chapters[i+1][1] - 1
            l.push({
                roman: convertToRoman(c[0]),
                title: c[0],
                page: c[1],
                key: `${c[0]}-${c[1]}`, // Unique key.
                last
            })
        }
        return l
    },
    /**
     * Returns the current chapter as
     * { title, page, last, roman, key },
     * where:
     * "title" is the name,
     * "roman" the name in roman figures, if it is a number,
     * "page" is the first page,
     * "last" is the last page,
     * "key" is "title-page"
     */
    currentChapter (state, getters) {
        if (state.loading) return null
        const chapters = getters.chapters
        const currentPage = state.currentPage
        return chapters.filter(chapter =>
            currentPage >= chapter.page && currentPage <= chapter.last
        )[0]
    },
    /**
     * The src of the image, when displayMode is 'onePage'.
     */
    currentPageImgSrc (state, getters) {
        if (state.loading) return null
        const number = state.currentPage + state.bookData.offset
        return getters.imgSrc(number)
    },
    /**
     * The src of the left (even) image, when displayMode is 'twoPages'.
     */
    currentPageImgPaireSrc (state, getters) {
        if (state.loading) return null
        const pagePaire = getters.pagePaire
        if (pagePaire === null) {
            return null
        } else {
            const numPair = state.bookData.offset + pagePaire
            return getters.imgSrc(numPair)
        }
    },
    /**
     * The src of the right (odd) image, when displayMode is 'twoPages'.
     */
    currentPageImgImpaireSrc (state, getters) {
        if (state.loading) return null
        const pageImpaire = getters.pageImpaire
        if (pageImpaire === null) {
            return null
        } else {
            const numImpair = state.bookData.offset + pageImpaire
            return getters.imgSrc(numImpair)
        }
    },
    /**
     * Book name shown on the info div.
     */
    bookInfo (state) {
        if (state.loading) return null
        return state.indexData.folders[state.bookData.folder][0]
    },
    /**
     * Edition information shown on the info div.
     */
    editionInfo (state) {
        if (state.loading) return null
        const info = state.indexData.folders[state.bookData.folder]
        return info[1] + ", " + info[2]
    },
    /**
     * Location of the pdf.
     */
    pdfLink (state) {
        if (state.loading) return null
        const pdf = state.indexData.folders[state.bookData.folder][3]
        if (pdf && pdf.startsWith("https://")) {
            return pdf
        } else if (pdf && pdf.startsWith("-")) {
            return `${PDFS_BASE}${pdf}`
        } else {
           return `${PDFS_BASE}/${pdf}`
        }
    },
    /**
     * Errata, as { href, book, page }.
     */
    errata (state, getters) {
        if (state.loading) return null
        const errata = []
        const folderInfo = state.indexData.folders[state.bookData.folder]
        if (folderInfo.length > 4) {
            const errors = folderInfo[4]
            for (let key in errors) {
                if (state.displayMode === 'onePage') {
                    if (errors[key] && errors[key].find(p => p == state.currentPage))
                        errata.push(key)
                } else if (state.displayMode === 'twoPages') {
                    if (errors[key] && errors[key].find(p =>
                            p == getters.pagePaire || p == getters.pageImpaire
                        ))
                        errata.push(key)
                }
            }
        }
        return errata.map(location => { return {
            href: `#/${location}`,
            page: location.split('/')[1],
            book: state.indexData.books.filter(b => b[0] == location.split('/')[0])[0][1]
        }})
    },
    /**
     * Triggers the location hash change.
     */
    locationHash (state) {
        if (state.loading) return null
        const hash = `#/${state.currentBook}/${state.currentPage}`
        window.location.hash = hash
        CANONICAL_NODE.setAttribute('href', `${CANONICAL}/${hash}`)
        return hash
    },
    /**
     * Returns the permalink
     */
    permalink (state, getters) {
        if (getters.locationHash)
            return `${CANONICAL}/${getters.locationHash}`
        return `${CANONICAL}`
    },
    /**
     * Triggers the title change.
     */
    title (state, getters) {
        if (state.loading) return null
        const chapterInRoman = convertToRoman(getters.currentChapter ? getters.currentChapter.title : '')
        const title = `p.${state.currentPage}-${chapterInRoman}-${getters.currentBookDisplayName} (${DOCUMENT_TITLE})`
        document.title = title
        return title
    },
    /**
     * Shortcuts documentation.
     */
    shortcuts () {
        return shortcuts
    }
}

/**
 * Actions for Vuex.
 */
const actions = {
    /**
     * Called at the main component creation and when
     * the location hash changes from the outside.
     */
    fetchInitData ({ commit }, locationHash) {
        fetchXHR(`${BASE}index.json`)
        .then(response => response.json())
        .then(indexData => {
            var currentBook = indexData.default
            var currentPage = null 
            if (locationHash && (m = locationHash.match(/#\/(.+)\/(.+)/))) {
                locationBook = m[1]
                if (indexData.books.find(a => a[0] === locationBook)) {
                    currentBook = locationBook
                    currentPage = parseInt(m[2])
                } else {
                    console.warn("Unknown book in the location hash:", locationBook)
                }
            }
            fetchXHR(`${BASE}jsons/${currentBook}.json`)
            .then(response => response.json())
            .then(bookData => {
                commit('init', {
                    indexData,
                    currentBook,
                    bookData,
                    currentPage: Number.isInteger(currentPage) && currentPage >= bookData.min && currentPage <= bookData.max ? currentPage : bookData.chapters[0][1]
                })
            })
        })
    },
    /**
     * Page change from the form input.
     */
    changePage ({ commit, state, getters, dispatch }, newValue) {
        const page = parseInt(newValue)
        if (page >= state.bookData.min && page <= state.bookData.max) {
            commit('changePageInSameBook', page)
        } else {
            if (page > state.bookData.max && getters.nextBook) {
                dispatch('changeBook', {
                    key: getters.nextBook,
                    page: newValue
                })
            } else if (page < state.bookData.min && getters.previousBook) {
                dispatch('changeBook', {
                    key: getters.previousBook,
                    page: newValue
                })
            }
        }
    },
    /**
     * Page increment from a button, or gesture.
     */
    incrementPage ({ commit, state, dispatch, getters }) {
        const page = getters.nextPage
        if (page === null) {
            // go to the next book if applicable
            if (getters.nextBook)
                dispatch('changeBook', { key: getters.nextBook, page : 'min' })
        } else {
            commit('changePageInSameBook', page)
        }
        if (state.displayMode === 'onePage') // scroll to the top
            document.body.scrollTop = document.documentElement.scrollTop = 0
    },
    /**
     * Page decrement from a button, or gesture.
     */
    decrementPage ({ commit, state, dispatch, getters }) {
        const page = getters.previousPage
        if (page === null) {
            // go to the previous book if applicable
            if (getters.previousBook)
                dispatch('changeBook', { key: getters.previousBook, page: 'max' })        
        } else {
            commit('changePageInSameBook', page)
        }
    },
    /**
     * Changes the chapter, or go back to the chapter begin.
     */
    changeChapter ({ commit, state }, title) {
        const page = state.bookData.chapters.filter(c => c[0] == title)[0][1]
        commit('changePageInSameBook', page)
    },
    /**
     * Changes the book.
     */
    changeBook ({ commit, state, getters, dispatch }, { key, page }) {
        fetchXHR(`${BASE}jsons/${key}.json`)
        .then(response => response.json())
        .then(bookData => {
            currentPage = bookData.chapters[0][1]
            if (page == 'max') {
                currentPage = bookData.max
            } else if (page == 'min') {
                currentPage = bookData.min
            } else if (Number.isInteger(page)) {
                currentPage = page
            }
            if (currentPage >= bookData.min && currentPage <= bookData.max) {
                commit('loadNewBook', {
                    currentBook: key,
                    bookData,
                    currentPage
                })
            } else {
                var nextBook, previousBook
                if (currentPage > bookData.max && (nextBook = getters.nextBookOfKey(key))) {
                    dispatch('changeBook', {
                        key: nextBook,
                        page
                    })
                } else if (currentPage < bookData.min && (previousBook = getters.previousBookOfKey(key))) {
                    dispatch('changeBook', {
                        key: previousBook,
                        page
                    })
                }    
            }
        })
    }
}

/**
 * The Vuex store.
 */
const store = new Vuex.Store({
    state,
    getters,
    mutations,
    actions
})

/**
 * Used by the keyboard shortcuts, it focuses
 * the node with the given id, or blurs it
 * if it is already focused.
 */
const focusOrBlur = (event, id) => {
    event.preventDefault()
    const e = document.getElementById(id)
    if (e === document.activeElement)
        e.blur()
    else
        e.focus()
}

/**
 * Fetches the Vue template (ui.html)
 * and initializes Vue with the Vuex store.
 */
fetchXHR(`${UI_ENV.uiPath}/ui.html`)
.then(res => res.text())
.then(template => {
    new Vue({
        store, // Our Vuex store.
        template, // The fetched content of the ui.html file.
        el: '#uiContainer',
        created () {
            // Shows the default data.
            this.$store.dispatch('fetchInitData', window.location.hash)
            // Sets up the keyboard shortcuts.
            window.addEventListener('keydown', this.keyListener)
        },
        mounted () {
            // Sets up the swipe navigation.
            const swipeElement = document.getElementById('hammer');
            if (swipeElement == null)
                console.warn("mounted: null element for hammer!")
            else {
                const mc = new Hammer(swipeElement);    
                mc.on('swipeleft', () => this.incrementPage())
                mc.on('swiperight', () => this.decrementPage())
            }
            // Sets up the navigation by changing the location hash.
            window.addEventListener('popstate', this.popStateListener)
        },
        destroyed () {
            window.removeEventListener('keydown', this.keyListener)
            window.removeEventListener('popstate', this.popStateListener)
        },    
        computed: {
            ...Vuex.mapState([
                'loading',
                'showInfo',
                'showNavBar',
                'displayMode',
                'currentBook',
                'currentPage',
                'zoom'
              ]),
            ...Vuex.mapGetters([
                'links',
                'canonical',
                'sites',
                'bookSelectorLabel',
                'books',
                'chapterSelectorLabel',
                'chapters',
                'currentChapter',
                'currentPageImgSrc',
                'currentPageImgPaireSrc',
                'currentPageImgImpaireSrc',
                'bookInfo',
                'editionInfo',
                'pdfLink',
                'errata',
                'locationHash',
                'permalink',
                'footerText',
                'footerLink',
                'footerLinkLabel',
                'title',
                'pageStyle',
                'pagePaireStyle',
                'pageImpaireStyle',
                'shortcuts',
                'minPage',
                'maxPage'
            ])
        },
        methods: {
            /**
             * Changes the site when another site is selected
             * on the sites select node.
             */
            changeSite (url) {
                window.location = url
            },
            /**
             * When the location hash changes, updates the state.
             */
            popStateListener () {
                if (this.$store.loading) return
                const hash = window.location.hash
                if (hash && (m = hash.match(/#\/(.+)\/(.+)/))) {
                    let hashBook = m[1]
                    let hashPage = m[2]
                    if (
                        this.$store.state.currentPage != parseInt(hashPage) ||
                        this.$store.state.currentBook != hashBook
                    ) {
                        this.$store.dispatch('fetchInitData', hash)
                    }
                }    
            },
            /**
             * Implements the keyboard shortcuts.
             * @param {*} event the keydown event.
             */
            keyListener (event) {
                switch (event.key) {
                    case 'a':
                    case 'ArrowRight':
                        this.incrementPage()
                        break
                    case 'r':
                    case 'ArrowLeft':
                        this.decrementPage()
                        break
                    case 'i':
                        this.toggleInfo()
                        break
                    case 'n':
                        this.toggleNavBar()
                        break
                    case 'v':
                        this.toggleDisplayMode()
                        break
                    case 'p':
                        focusOrBlur(event, 'pages')
                        break
                    case 'c':
                        focusOrBlur(event, 'chapters')
                        break
                    case 'l':
                        focusOrBlur(event, 'books')
                        break
                    case 's':
                        focusOrBlur(event, 'sites')
                        break
                    case 'o':
                    case 't':
                        window.open(window.location, '_blank').focus()
                        break
                    case 'q':
                        window.close()
                        break
                    case '+':
                        this.incrZoom()
                        break
                    case '-':
                        this.decrZoom()
                        break
                }    
            },
            /**
             * Navigates to the next or previous page by clicking on the
             * left or right part of the image, when displayMode is "onePage".
             * @param {*} event  the click event on the img node
             */
            incrOrDecrFromPage (event) {
                const x = event.clientX - event.target.offsetLeft;
                const width = event.target.width;
                if (x > width / 2) {
                    // Click on the right part.
                    this.incrementPage()
                } else {
                    // Click on the left part.
                    this.decrementPage()
                }            
            },
            ...Vuex.mapMutations([
                'toggleInfo',
                'toggleNavBar',
                'toggleDisplayMode',
                'incrZoom',
                'decrZoom'
            ]),
            ...Vuex.mapActions([
                'incrementPage',
                'decrementPage',
                'changePage',
                'changeChapter',
                'changeBook'
            ])
        }
    })
})



}