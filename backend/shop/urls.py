# backend/shop/urls.py
from django.urls import path
from .views import (
    ProductListView, ProductDetailView, CategoryListView, PromoBannerListView,
    ShopSettingsView, FaqListView, DealOfTheDayView, CartView, CalculateSelectionView,
    OrderCreateView, OrderDetailView, ArticleListView, ArticleDetailView, ArticleIncrementViewCountView,
    TinyMCEImageUploadView
)
from .views_security import HoneyPotView

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('banners/', PromoBannerListView.as_view(), name='banner-list'),
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('settings/', ShopSettingsView.as_view(), name='shop-settings'),
    path('faq/', FaqListView.as_view(), name='faq-list'),
    path('deal-of-the-day/', DealOfTheDayView.as_view(), name='deal-of-the-day'),
    path('cart/', CartView.as_view(), name='cart-detail'),
    path('calculate-selection/', CalculateSelectionView.as_view(), name='calculate-selection'),
    path('orders/create/', OrderCreateView.as_view(), name='order-create'),
    path('orders/<int:id>/', OrderDetailView.as_view(), name='order-detail'), # <-- New Secure Endpoint
    path('articles/', ArticleListView.as_view(), name='article-list'),
    path('articles/<slug:slug>/', ArticleDetailView.as_view(), name='article-detail'),
    path('articles/<slug:slug>/increment-view/', ArticleIncrementViewCountView.as_view(), name='article-increment-view'),
    # TinyMCE image upload endpoint
    path('tinymce/upload-image/', TinyMCEImageUploadView.as_view(), name='tinymce-image-upload'),
    
    # --- HoneyPot Trap ---
    path('admin-secret-debug/', HoneyPotView.as_view(), name='honeypot-trap'),
]