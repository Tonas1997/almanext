from django.http.response import JsonResponse
from django.shortcuts import render
from django.core.serializers.json import DjangoJSONEncoder
import json

def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'sky_map/main.html')

def get_clusters(request):
    with open('clusters.json') as f:
        data = json.load(f)
        json_clusters = json.dumps(data, cls=DjangoJSONEncoder)
        return JsonResponse(json_clusters, safe=False)
    
# Create your views here.
