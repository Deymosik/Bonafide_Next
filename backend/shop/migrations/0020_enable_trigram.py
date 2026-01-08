from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension

class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0019_remove_article_og_image_url_article_og_image'),
    ]

    operations = [
        TrigramExtension(),
    ]
