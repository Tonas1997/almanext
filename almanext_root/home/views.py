from common.models import Band
from django.shortcuts import render
from django.http import JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
import json

def index(request):
    return render(request, 'home/main.html')

def get_archive_info(request):
    with open('archive_info.json') as f:
        data = json.load(f)
        json_area_per_freq = json.dumps(data, cls=DjangoJSONEncoder)
        return JsonResponse(json_area_per_freq, safe=False)

def get_bands(request):
    bands_list = []
    bands_result = Band.objects.filter(designation__gte = 3)
    for b in bands_result:
        bands_list.append({
            "designation": b.designation,
            "start": b.start,
            "end": b.end
        })
    
    lines_json = json.dumps({"bands": bands_list}, cls=DjangoJSONEncoder)

    return JsonResponse(lines_json, safe=False)

def get_area_per_freq(request):
    with open('area_per_freq.json') as f:
        data = json.load(f)
        json_area_per_freq = json.dumps(data, cls=DjangoJSONEncoder)
        return JsonResponse(json_area_per_freq, safe=False)
