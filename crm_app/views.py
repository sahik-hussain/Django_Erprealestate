from django.http import HttpResponse


def index(request):
    return HttpResponse("CRM app is ready.")
