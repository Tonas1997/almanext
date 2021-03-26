from django.shortcuts import render

def index(request):
    #return HttpResponse("<h1>Hello world</h1>")
    return render(request, 'sky_map/main.html')
    
# Create your views here.
