from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Min, Max
from common.models import Observation, Band
import json

# frequency bucket size in GHz
BUCKET_SIZE = 1.0

def calc_area_per_freq():
    # first, create a list that will contain all frequency buckets
    freq_start = Band.objects.filter(designation__gte = 3).aggregate(Min('start')).get('start__min')
    freq_end = Band.objects.filter(designation__gte = 3).aggregate(Max('end')).get('end__max')
    size = int((freq_end - freq_start) / BUCKET_SIZE)

    freq_list = []
    obs_list = []
    curr_freq = freq_start
    for i in range(0, size):
        # append a new entry
        freq_list.append({
            "freq": curr_freq,
            "total_area": 0
        })
        obs_list.append({
            "observations": [],
        })
        curr_freq += BUCKET_SIZE

    obs_set = Observation.objects.all()
    # iterate over all observations
    for o in obs_set:
        print("Processing observation " + str(o))
        # get this observation's total area and spectral windows
        area = o.total_area
        windows = o.spec_windows.all()
        id = o.id
        # iterate over the observation's windows
        for w in windows:
            start = w.start
            curr_freq = start
            end = w.end
            if((curr_freq >= freq_start) and (curr_freq <= freq_end)):
                while(curr_freq <= end):
                    pos = int((curr_freq - freq_start)/BUCKET_SIZE)-1
                    # this will prevent overlapping windows from having their area incremented twice
                    if(id not in obs_list[pos]["observations"]):
                        obs_list[pos]["observations"].append(id)
                        freq_list[pos]["total_area"] += area
                    curr_freq += 0.01
    
    area_per_freq = { "bucket_size" : BUCKET_SIZE, "areas": freq_list}
                
    with open('area_per_freq.json', 'w') as outfile:
        json.dump(area_per_freq, outfile, indent=4, cls=DjangoJSONEncoder)

class Command(BaseCommand):
    args = '<temp>'

    def handle(self, *args, **options):
        calc_area_per_freq()