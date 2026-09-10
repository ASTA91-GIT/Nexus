import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))
from app.ai.entity_extraction import extract_entities_and_relationships_fallback
with open('scratch/test_a.txt') as f: print('A:', extract_entities_and_relationships_fallback(f.read()))
with open('scratch/test_b.txt') as f: print('B:', extract_entities_and_relationships_fallback(f.read()))