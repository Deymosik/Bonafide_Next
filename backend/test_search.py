import os
import django
from django.db.models import Q

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from shop.models import Product
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, TrigramSimilarity

def test_search(query_str):
    print(f"\n--- Testing Query: '{query_str}' ---")
    
    vector = (
        SearchVector('name', weight='A') +
        SearchVector('sku', weight='A') +
        SearchVector('description', weight='B')
    )
    search_query = SearchQuery(query_str)
    
    # Base Queryset matching view logic
    base_qs = Product.objects.filter(is_active=True)
    qs = Product.annotate_with_price(base_qs)
    
    # Annotate and Filter
    results = qs.annotate(
        rank=SearchRank(vector, search_query),
        similarity=TrigramSimilarity('name', query_str)
    ).filter(
        Q(rank__gte=0.01) | Q(similarity__gt=0.01)
    ).order_by('-rank', '-similarity')
    
    count = results.count()
    print(f"Found {count} results.")
    
    for p in results[:5]:
        print(f"  [Match] '{p.name}' (SKU: {p.sku})")
        print(f"          Rank: {p.rank}, Similarity: {p.similarity}")

if __name__ == "__main__":
    # Test cases
    test_search("airpods")   # Should match exact
    test_search("aerpods")   # Should match fuzzy
    test_search("iphone")    # Should match exact
    test_search("ipone")     # Should match fuzzy
