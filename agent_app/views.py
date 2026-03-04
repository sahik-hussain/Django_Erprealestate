from django.http import HttpResponse


def index(request):
    return HttpResponse("Agent app is ready.")
