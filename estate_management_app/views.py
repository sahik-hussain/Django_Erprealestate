from django.http import HttpResponse


def index(request):
    return HttpResponse("Estate Management app is ready.")
