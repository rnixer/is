import unittest, tempfile
from pathlib import Path
from datetime import date
from tools.instagram.extract import extract

class MigrationTests(unittest.TestCase):
    def test_public_posts_range_nested_media_and_missing_price(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            target=root/'your_instagram_activity/media/posts_1.html'
            target.parent.mkdir(parents=True)
            def block(caption,path,when):
                return f'<div><h2>{caption}</h2><a href="{path}">image</a><div class="_a6-o">{when}</div></div>'
            target.write_text('<main>'+block('Top\nอก : 48”\nPrice : 200 THB','media/posts/202609/a.jpg','Sep 08, 2026 3:08 am')+block('Top\nอก : 50”','media/posts/b.jpg','Jul 01, 2026 3:08 am')+block('Top\nPrice : 999 THB','media/posts/c.jpg','Jun 30, 2026 3:08 am')+'</main>',encoding='utf-8')
            products,_=extract(root,date(2026,7,1),date(2026,10,5))
            self.assertEqual(len(products),2)
            self.assertEqual(products[0]['priceSatang'],20000)
            self.assertIsNone(products[1]['priceSatang'])
            self.assertEqual(products[0]['sourceMedia'],['media/posts/202609/a.jpg'])
            self.assertTrue(all(p['reviewState']=='NEEDS_REVIEW' and not p['published'] and not p['available'] for p in products))
if __name__=='__main__':unittest.main()
