from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from shop.models import Article, ArticleCategory

User = get_user_model()

class ArticleSEOTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testauthor', password='password')
        self.category = ArticleCategory.objects.create(name='Test Category', slug='test-category')
        
        self.article = Article.objects.create(
            title='Test Article',
            slug='test-article',
            author=self.user,
            category=self.category,
            content='<p>Test content</p>',
            status=Article.Status.PUBLISHED,
            meta_title='Custom SEO Title',
            meta_description='Custom SEO Description',
            og_image_url='https://example.com/og-image.jpg',
            canonical_url='https://example.com/canonical'
        )
        self.url = reverse('article-detail', kwargs={'slug': self.article.slug})

    def test_seo_fields_in_api_response(self):
        """Test that SEO fields are correctly returned by the API."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['meta_title'], 'Custom SEO Title')
        self.assertEqual(data['meta_description'], 'Custom SEO Description')
        self.assertEqual(data['og_image_url'], 'https://example.com/og-image.jpg')
        self.assertEqual(data['canonical_url'], 'https://example.com/canonical')

    def test_default_seo_fallback(self):
        """Test that API handles empty SEO fields if necessary (though logic is mostly frontend)."""
        # Create article without specific SEO fields
        article2 = Article.objects.create(
             title='Simple Article',
             slug='simple-article',
             status=Article.Status.PUBLISHED
        )
        url = reverse('article-detail', kwargs={'slug': article2.slug})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        # Fields should be present but empty strings for blank=True fields
        self.assertEqual(data['meta_title'], '')
        self.assertEqual(data['meta_description'], '')
        self.assertEqual(data['og_image_url'], '') 
        self.assertEqual(data['canonical_url'], '')
