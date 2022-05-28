import json

with open("sitemap.xml", "w") as sitemap:
    print('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', file=sitemap)
    with open("CNAME") as cname_file:
        cname = cname_file.read().strip()
        with open("index.json") as index_file:
            index =  json.load(index_file)
            for book_array in index["books"]:
                book_name = book_array[0]
                print(F"book: {book_name}")
                with open(F"jsons/{book_name}.json") as book_file:
                    book = json.load(book_file)
                    min_page = book['min']
                    print(F"book: {book_name} - min: {min_page}")
                    print(F"<url><loc>https://{cname}/#/{book_name}/{min_page}</loc></url>", file=sitemap)
                    for chapter_array in book['chapters']:
                        name = chapter_array[0]
                        page = chapter_array[1]
                        print(F'book: {book_name} - chapter: "{name}" - page: {page}')
                        if page != min_page:
                            print(F"<url><loc>https://{cname}/#/{book_name}/{page}</loc></url>", file=sitemap)
                        else:
                            print(F"Skipping chapter with same page: {page}")
    print('</urlset>', file=sitemap)